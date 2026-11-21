import { beforeEach, describe, expect, it } from 'vitest';
import { db, SCHEMA_VERSION, type ProfileRecord } from './db';
import {
  BACKUP_APP,
  InvalidBackupError,
  eraseEverything,
  exportBackup,
  normaliserProfil,
  parseBackup,
  restoreBackup,
  summarizeBackup,
} from './backup';
import { createProject } from './repositories/project';
import { completeDay } from './repositories/progress';
import { saveDossierDrafts } from './repositories/dossier';
import { recordPrompt } from './repositories/notebook';
import { getProfile, clearProfile } from './repositories/profile';

async function seed() {
  const project = await createProject({
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux',
  });
  await completeDay(project.id, 1, { confidence: 4 });
  await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
    { kind: 'fiche_projet', title: 'Fiche projet', blocks: [{ type: 'paragraph', text: 'Texte' }] },
  ]);
  await recordPrompt({
    projectId: project.id,
    day: 1,
    lessonId: 'day-01',
    promptId: 'p1',
    title: 'Faire relire mon projet',
    tool: 'claude',
    lang: 'fr',
    text: 'Tu es un conseiller agricole…',
  });
  return project;
}

describe('sauvegarde', () => {
  beforeEach(async () => {
    await Promise.all([
      clearProfile(),
      db.projects.clear(),
      db.progress.clear(),
      db.dossierItems.clear(),
      db.promptEntries.clear(),
      db.badges.clear(),
    ]);
  });

  it('exporte tout ce qui compte', async () => {
    await seed();
    const backup = await exportBackup(new Date('2026-11-18T10:00:00Z'));

    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.exportedAt).toBe('2026-11-18T10:00:00.000Z');
    expect(backup.projects).toHaveLength(1);
    expect(backup.progress).toHaveLength(1);
    expect(backup.dossierItems).toHaveLength(1);
    expect(backup.promptEntries).toHaveLength(1);
    expect(backup.profile?.id).toBe(1);
  });

  it('résume la sauvegarde avant de l’appliquer', async () => {
    await seed();
    const summary = summarizeBackup(await exportBackup());

    expect(summary.projectName).toBe('Élevage ovin Aïn Defla');
    expect(summary.daysDone).toBe(1);
    expect(summary.dossierItems).toBe(1);
    expect(summary.prompts).toBe(1);
  });

  it('restaure une sauvegarde en remplaçant les données', async () => {
    await seed();
    const backup = await exportBackup();

    await eraseEverything();
    expect(await db.projects.count()).toBe(0);

    await restoreBackup(backup);
    expect(await db.projects.count()).toBe(1);
    expect(await db.progress.count()).toBe(1);
    expect(await db.dossierItems.count()).toBe(1);
    expect(await db.promptEntries.count()).toBe(1);
    expect((await getProfile()).activeProjectId).toBe(backup.projects[0]?.id);
  });

  it('n’empile pas les données lors d’une restauration', async () => {
    await seed();
    const backup = await exportBackup();

    await restoreBackup(backup);
    await restoreBackup(backup);

    expect(await db.projects.count()).toBe(1);
    expect(await db.dossierItems.count()).toBe(1);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(InvalidBackupError);
    expect(() => parseBackup({ app: 'autre-appli', schemaVersion: 1 })).toThrow(InvalidBackupError);
    expect(() => parseBackup(null)).toThrow(InvalidBackupError);
  });

  it('accepte une sauvegarde vide, produite avant toute utilisation', async () => {
    const backup = await exportBackup();
    expect(backup.projects).toEqual([]);
    expect(() => parseBackup(JSON.parse(JSON.stringify(backup)))).not.toThrow();
  });

  it('efface tout, y compris le cache de peinture', async () => {
    await seed();
    localStorage.setItem('agri28.theme', 'dark');

    await eraseEverything();

    expect(await db.projects.count()).toBe(0);
    expect(await db.promptEntries.count()).toBe(0);
    expect(localStorage.getItem('agri28.theme')).toBeNull();
  });
});

describe('restaurer une sauvegarde faite avant une migration', () => {
  /** Profil tel que le schéma 4 l'écrivait : aucun champ de niveau. */
  const profilV4 = {
    id: 1,
    lang: 'fr',
    theme: 'system',
    reminderEnabled: false,
    reminderTime: null,
    onboardingDone: false,
    activeProjectId: 'p',
    createdAt: 1000,
    updatedAt: 1000,
    schemaVersion: 4,
  };

  it('rend « null » et non « undefined » pour un champ ajouté depuis', () => {
    // Le cas qui a motivé la correction. `undefined` n'est ni un niveau ni le
    // `null` que la garde attend — elle teste `=== null` — donc la personne
    // n'était jamais envoyée au test, tout en lisant « test non encore
    // passé » dans ses réglages.
    const normalise = normaliserProfil(profilV4);

    expect(normalise.niveauParcours).toBeNull();
    expect(normalise.niveauParcours).not.toBeUndefined();
    expect(normalise.niveauScores).toBeNull();
    expect(normalise.niveauEvalueLe).toBeNull();
  });

  it('remet la version de schéma à jour', () => {
    // Sinon la ligne restaurée resterait marquée « 4 » pour toujours :
    // l'`upgrade` de Dexie ne rejoue pas sur une ligne écrite à la main.
    expect(normaliserProfil(profilV4).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('garde ce que la sauvegarde contenait vraiment', () => {
    const normalise = normaliserProfil({ ...profilV4, lang: 'ar', theme: 'dark' });

    expect(normalise.lang).toBe('ar');
    expect(normalise.theme).toBe('dark');
    expect(normalise.activeProjectId).toBe('p');
    expect(normalise.createdAt).toBe(1000);
  });

  it('ne laisse pas une clé explicitement « undefined » écraser le défaut', () => {
    // Un fichier JSON n'en produit jamais, mais un appel direct, si.
    const normalise = normaliserProfil({ ...profilV4, niveauParcours: undefined });
    expect(normalise.niveauParcours).toBeNull();
  });

  it('se voit de bout en bout : après restauration, le profil est complet', async () => {
    await restoreBackup({
      app: BACKUP_APP,
      schemaVersion: 4,
      exportedAt: new Date(0).toISOString(),
      profile: profilV4 as unknown as ProfileRecord,
      projects: [],
      progress: [],
      dossierItems: [],
      promptEntries: [],
      badges: [],
    });

    const profil = await getProfile();
    expect(profil.niveauParcours).toBeNull();
    expect(profil.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
