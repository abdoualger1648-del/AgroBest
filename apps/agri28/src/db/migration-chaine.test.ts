import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { Agri28Db, SCHEMA_VERSION } from './db';
import { makeProgress, makeProject } from '@/test/factories';

/**
 * Chaîne complète de migrations : de la toute première version du schéma
 * jusqu'à la version courante, en une seule ouverture.
 *
 * Pourquoi ce test existe : installer une nouvelle version de l'application
 * par-dessus l'ancienne ne doit RIEN effacer. Android conserve les données de
 * l'application tant que l'identifiant de paquet et la clé de signature ne
 * changent pas — mais la base, elle, doit encore savoir se mettre à jour
 * depuis n'importe quel cran passé. `migration5.test.ts` ne couvre que le
 * saut 4 → 5 ; quelqu'un qui aurait installé la version 1.2.0 et sauté les
 * suivantes arrive avec une base plus ancienne.
 *
 * On ouvre de VRAIES bases aux anciens schémas, on y écrit, on les referme,
 * puis on ouvre `Agri28Db` : c'est le seul moyen d'éprouver un `upgrade`.
 */

/** Schéma de la version 1 (phase 1) : préférences uniquement. */
function ouvrirEnV1(nom: string): Dexie {
  const base = new Dexie(nom);
  base.version(1).stores({ profile: 'id', kv: 'key' });
  return base;
}

/** Schéma de la version 3 (phase 5) : avant le cache de compte. */
function ouvrirEnV3(nom: string): Dexie {
  const base = new Dexie(nom);
  base.version(3).stores({
    profile: 'id',
    kv: 'key',
    projects: 'id, updatedAt',
    progress: 'id, projectId, day, status, completedAt, [projectId+day]',
    dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
    promptEntries: 'id, projectId, day, favorite, updatedAt, *tags',
    badges: 'id, projectId, earnedAt',
  });
  return base;
}

/** Profil tel que la version 1 l'écrivait : ni dossier actif, ni niveau. */
function profilV1(): Record<string, unknown> {
  return {
    id: 1,
    lang: 'ar',
    theme: 'dark',
    reminderEnabled: true,
    reminderTime: '19:30',
    onboardingDone: true,
    createdAt: 500,
    updatedAt: 500,
    schemaVersion: 1,
  };
}

async function avec<T>(nom: string, travail: () => Promise<T>): Promise<T> {
  await Dexie.delete(nom);
  try {
    return await travail();
  } finally {
    await Dexie.delete(nom);
  }
}

describe('chaîne de migrations, de la version 1 à la version courante', () => {
  it('une base de la version 1 se migre sans perdre les préférences', async () => {
    const nom = 'agri28-chaine-v1';

    const profil = await avec(nom, async () => {
      const ancienne = ouvrirEnV1(nom);
      await ancienne.open();
      await ancienne.table('profile').put(profilV1());
      await ancienne.table('kv').put({ key: 'dernierEcran', value: '/jour/3' });
      ancienne.close();

      const neuve = new Agri28Db(nom);
      await neuve.open();
      const resultat = await neuve.profile.get(1);
      const kv = await neuve.kv.get('dernierEcran');
      neuve.close();
      expect(kv?.value).toBe('/jour/3');
      return resultat;
    });

    // Les préférences de l'utilisateur sont intactes.
    expect(profil?.lang).toBe('ar');
    expect(profil?.theme).toBe('dark');
    expect(profil?.reminderTime).toBe('19:30');
    expect(profil?.onboardingDone).toBe(true);
    expect(profil?.createdAt).toBe(500);

    // Les champs ajoutés depuis ont leur valeur de migration.
    expect(profil?.activeProjectId).toBeNull();
    expect(profil?.niveauParcours).toBeNull(); // aucun dossier : le test s'applique
    expect(profil?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('une base de la version 3 garde dossier, progression, briques, prompts et badges', async () => {
    const nom = 'agri28-chaine-v3';

    const apres = await avec(nom, async () => {
      const ancienne = ouvrirEnV3(nom);
      await ancienne.open();
      await ancienne
        .table('profile')
        .put({ ...profilV1(), activeProjectId: 'p', schemaVersion: 3 });
      await ancienne.table('projects').put(makeProject());
      await ancienne.table('progress').put(makeProgress(1));
      await ancienne.table('progress').put(makeProgress(2));
      await ancienne.table('dossierItems').put({
        id: 'd:01',
        projectId: 'p',
        day: 1,
        kind: 'fiche',
        title: 'Ma fiche projet',
        lang: 'fr',
        blocks: [],
        sourceLessonId: 'day-01',
        pinned: false,
        createdAt: 1,
        updatedAt: 1,
        version: 1,
      });
      await ancienne.table('promptEntries').put({
        id: 'pr:01',
        projectId: 'p',
        day: 1,
        lessonId: 'day-01',
        promptId: 'objectif',
        title: 'Mon objectif',
        tool: 'chatgpt',
        lang: 'fr',
        text: 'texte retouché',
        originalText: 'texte initial',
        tags: ['objectif'],
        favorite: true,
        createdAt: 1,
        updatedAt: 1,
      });
      await ancienne.table('badges').put({
        id: 'p:premiere-semaine',
        projectId: 'p',
        badge: 'premiere-semaine',
        earnedAt: 2,
      });
      ancienne.close();

      const neuve = new Agri28Db(nom);
      await neuve.open();
      const resultat = {
        profil: await neuve.profile.get(1),
        projets: await neuve.projects.count(),
        progression: await neuve.progress.count(),
        briques: await neuve.dossierItems.count(),
        prompts: await neuve.promptEntries.get('pr:01'),
        badges: await neuve.badges.count(),
        comptes: await neuve.compte.count(),
      };
      neuve.close();
      return resultat;
    });

    // Rien n'a disparu.
    expect(apres.projets).toBe(1);
    expect(apres.progression).toBe(2);
    expect(apres.briques).toBe(1);
    expect(apres.prompts?.text).toBe('texte retouché');
    expect(apres.prompts?.favorite).toBe(true);
    expect(apres.badges).toBe(1);

    // La table ajoutée en version 4 existe, et elle est vide : l'utilisateur
    // continuera sans compte jusqu'à ce qu'il en crée un.
    expect(apres.comptes).toBe(0);

    // Un dossier existe, donc le parcours est déjà en route (D89).
    expect(apres.profil?.niveauParcours).toBe('intermediaire');
    expect(apres.profil?.activeProjectId).toBe('p');
    expect(apres.profil?.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
