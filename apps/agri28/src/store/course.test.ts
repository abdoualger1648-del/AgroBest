import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { useCourse } from './course';

const INPUT = {
  name: 'Maraîchage Mitidja',
  type: 'maraichage' as const,
  scaleValue: 4,
  wilayaCode: '09',
  objective: 'Produire 10 tonnes de tomates',
};

describe('store du parcours', () => {
  beforeEach(async () => {
    await Promise.all([
      clearProfile(),
      db.projects.clear(),
      db.progress.clear(),
      db.dossierItems.clear(),
    ]);
    useCourse.setState({ project: null, progress: [], dossierCount: 0, loaded: false });
  });

  it('démarre sans projet', async () => {
    await useCourse.getState().load();
    expect(useCourse.getState().project).toBeNull();
    expect(useCourse.getState().loaded).toBe(true);
    expect(useCourse.getState().streak.current).toBe(0);
  });

  it('crée le projet puis suit la progression et la série', async () => {
    const project = await useCourse.getState().createProject(INPUT);
    expect(useCourse.getState().project?.id).toBe(project.id);

    await useCourse.getState().startDay(1);
    expect(useCourse.getState().progress[0]?.status).toBe('in_progress');

    await useCourse.getState().saveDay(1, { captures: { c1: 'Ma réponse' } });
    expect(useCourse.getState().progress[0]?.captures['c1']).toBe('Ma réponse');

    await useCourse.getState().unlockDay(3);
    expect(useCourse.getState().progress.find((entry) => entry.day === 3)?.unlocked).toBe(true);
  });

  it('garde une référence stable pour progress tant que rien ne change', async () => {
    await useCourse.getState().createProject(INPUT);
    const first = useCourse.getState().progress;
    expect(useCourse.getState().progress).toBe(first);
  });
});
