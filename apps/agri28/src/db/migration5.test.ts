import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { Agri28Db, SCHEMA_VERSION, type ProfileRecord } from './db';
import { makeProject } from '@/test/factories';

/**
 * Migration vers le schéma 5 (phase 12).
 *
 * On ouvre une VRAIE base en version 4, on y écrit, on la referme, puis on
 * l'ouvre en version 5 : c'est le seul moyen d'éprouver un `upgrade` Dexie.
 * L'enjeu est la décision D89 — une installation déjà en route ne doit pas se
 * retrouver devant un test de niveau obligatoire entre son jour 14 et son
 * jour 15.
 */

/** Schéma de la version 4, tel qu'il était avant la phase 12. */
function ouvrirEnV4(nom: string): Dexie {
  const ancienne = new Dexie(nom);
  ancienne.version(4).stores({
    profile: 'id',
    kv: 'key',
    projects: 'id, updatedAt',
    progress: 'id, projectId, day, status, completedAt, [projectId+day]',
    dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
    promptEntries: 'id, projectId, day, favorite, updatedAt, *tags',
    badges: 'id, projectId, earnedAt',
    compte: 'id',
  });
  return ancienne;
}

/** Profil tel que la version 4 l'écrivait : sans aucun champ de niveau. */
function profilV4(): Record<string, unknown> {
  return {
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
}

async function migrer(nom: string, avecDossier: boolean): Promise<ProfileRecord> {
  await Dexie.delete(nom);

  const ancienne = ouvrirEnV4(nom);
  await ancienne.open();
  await ancienne.table('profile').put(profilV4());
  if (avecDossier) await ancienne.table('projects').put(makeProject());
  ancienne.close();

  const neuve = new Agri28Db(nom);
  await neuve.open();
  const profil = await neuve.profile.get(1);
  neuve.close();
  await Dexie.delete(nom);

  if (!profil) throw new Error('profil perdu par la migration');
  return profil;
}

describe('migration du schéma 4 vers le schéma 5', () => {
  it('une installation déjà en route reçoit le cran neutre, pas un test obligatoire (D89)', async () => {
    const profil = await migrer('agri28-migr-en-route', true);

    expect(profil.niveauParcours).toBe('intermediaire');
    expect(profil.niveauScores).toBeNull();
    expect(profil.niveauEvalueLe).toBeNull();
    expect(profil.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('une installation sans dossier passera le test, comme une installation neuve', async () => {
    const profil = await migrer('agri28-migr-vierge', false);

    expect(profil.niveauParcours).toBeNull();
    expect(profil.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('ne touche à rien d’autre dans le profil', async () => {
    const profil = await migrer('agri28-migr-intact', true);

    expect(profil.lang).toBe('fr');
    expect(profil.theme).toBe('system');
    expect(profil.activeProjectId).toBe('p');
    expect(profil.createdAt).toBe(1000);
  });
});
