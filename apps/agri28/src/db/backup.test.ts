import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  BACKUP_APP,
  InvalidBackupError,
  eraseEverything,
  exportBackup,
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
