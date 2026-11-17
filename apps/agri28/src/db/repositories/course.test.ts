import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createProject, getActiveProject, updateProject, deleteProject } from './project';
import {
  completeDay,
  completionTimestamps,
  getDayProgress,
  listProgress,
  saveDayProgress,
  startDay,
  unlockDay,
} from './progress';
import { countDossierItems, listDossier, saveDossierDrafts } from './dossier';
import { clearProfile, getProfile } from './profile';
import { computeDayStatuses } from '@/domain/course';

const input = {
  name: 'Élevage ovin Aïn Defla',
  type: 'ovin' as const,
  scaleValue: 60,
  wilayaCode: '44',
  objective: 'Vendre 40 agneaux en 12 mois',
};

describe('projet, progression et dossier (IndexedDB)', () => {
  beforeEach(async () => {
    await Promise.all([
      clearProfile(),
      db.projects.clear(),
      db.progress.clear(),
      db.dossierItems.clear(),
    ]);
  });

  it('crée le projet, le rend actif et termine l’onboarding', async () => {
    const project = await createProject(input);

    expect(project.id).toBeTruthy();
    expect(project.scale).toEqual({ value: 60, unit: 'tete' });
    expect(project.horizonMonths).toBe(12);

    const profile = await getProfile();
    expect(profile.activeProjectId).toBe(project.id);
    expect(profile.onboardingDone).toBe(true);
    expect((await getActiveProject())?.id).toBe(project.id);
  });

  it('choisit l’unité par défaut selon le type de projet', async () => {
    const serre = await createProject({ ...input, type: 'serre', scaleValue: 500 });
    expect(serre.scale.unit).toBe('m2');
    const rucher = await createProject({ ...input, type: 'apiculture', scaleValue: 30 });
    expect(rucher.scale.unit).toBe('ruche');
  });

  it('modifie le projet sans perdre sa date de création', async () => {
    const project = await createProject(input);
    const updated = await updateProject(project.id, { objective: 'Nouvel objectif' });
    expect(updated.objective).toBe('Nouvel objectif');
    expect(updated.createdAt).toBe(project.createdAt);
  });

  it('ouvre une journée puis la valide', async () => {
    const project = await createProject(input);

    const started = await startDay(project.id, 1);
    expect(started.status).toBe('in_progress');
    expect(started.week).toBe(1);

    await saveDayProgress(project.id, 1, { captures: { c1: 'Mon objectif' } });
    const done = await completeDay(project.id, 1, {
      quiz: { answers: { q1: 'b' }, score: 3, total: 3, attempts: 1 },
      confidence: 4,
      timeSpentSec: 870,
    });

    expect(done.status).toBe('done');
    expect(done.completedAt).toBeGreaterThan(0);
    expect(done.captures['c1']).toBe('Mon objectif');
    expect(done.confidence).toBe(4);
    expect(done.sectionsDone).toEqual({ concept: true, practice: true, quiz: true, review: true });
  });

  it('ouvre le jour 2 une fois le jour 1 validé', async () => {
    const project = await createProject(input);
    await completeDay(project.id, 1);

    const statuses = computeDayStatuses(await listProgress(project.id));
    expect(statuses.get(1)).toBe('done');
    expect(statuses.get(2)).toBe('available');
  });

  it('ne perd pas la date de validation si on rejoue la journée', async () => {
    const project = await createProject(input);
    const first = await completeDay(project.id, 1);
    const again = await completeDay(project.id, 1, { confidence: 5 });

    expect(again.completedAt).toBe(first.completedAt);
    expect(again.confidence).toBe(5);
  });

  it('déverrouille un jour à la demande', async () => {
    const project = await createProject(input);
    await unlockDay(project.id, 5);

    const entry = await getDayProgress(project.id, 5);
    expect(entry?.unlocked).toBe(true);
    expect(computeDayStatuses(await listProgress(project.id)).get(5)).toBe('in_progress');
  });

  it('liste les dates de validation pour la série', async () => {
    const project = await createProject(input);
    await completeDay(project.id, 1);
    await completeDay(project.id, 2);

    const timestamps = await completionTimestamps(project.id);
    expect(timestamps).toHaveLength(2);
    expect(timestamps.every((value) => value > 0)).toBe(true);
  });

  it('enregistre les briques du Dossier sans doublon quand on rejoue', async () => {
    const project = await createProject(input);
    const drafts = [
      {
        kind: 'fiche_projet',
        title: 'Fiche projet',
        blocks: [{ type: 'paragraph' as const, text: 'Un' }],
      },
    ];

    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', drafts);
    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
      { ...drafts[0]!, blocks: [{ type: 'paragraph' as const, text: 'Deux' }] },
    ]);

    const items = await listDossier(project.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.version).toBe(2);
    expect(items[0]?.blocks).toEqual([{ type: 'paragraph', text: 'Deux' }]);
    expect(await countDossierItems(project.id)).toBe(1);
  });

  it('supprime un projet avec sa progression et son dossier', async () => {
    const project = await createProject(input);
    await completeDay(project.id, 1);
    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
      { kind: 'fiche_projet', title: 'Fiche', blocks: [{ type: 'paragraph', text: 'X' }] },
    ]);

    await deleteProject(project.id);

    expect(await listProgress(project.id)).toEqual([]);
    expect(await listDossier(project.id)).toEqual([]);
    expect(await getActiveProject()).toBeNull();
  });
});
