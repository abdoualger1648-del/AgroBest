import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { LessonNotFoundError } from '@/content/loader';
import type * as LoaderModule from '@/content/loader';

/**
 * Les 28 jours sont désormais tous rédigés, dans les deux langues : l'écran
 * « contenu indisponible » n'est donc plus atteignable par une adresse.
 * On simule l'absence pour vérifier que l'application l'annonce proprement
 * au lieu de planter — par exemple si un fichier de leçon venait à manquer.
 */
vi.mock('@/content/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof LoaderModule>();
  return {
    ...actual,
    availableDays: () => [],
    hasLesson: () => false,
    loadLesson: (day: number, lang: 'fr' | 'ar') =>
      Promise.reject(new LessonNotFoundError(day, lang)),
  };
});

const { renderApp } = await import('@/test/renderApp');
const { createProject } = await import('@/db/repositories/project');
const { useCourse } = await import('@/store/course');
const { db } = await import('@/db/db');
const { clearProfile } = await import('@/db/repositories/profile');

describe('leçon manquante', () => {
  beforeEach(async () => {
    await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear()]);
    useCourse.setState({ project: null, progress: [], dossierCount: 0, loaded: false });
    await createProject({
      name: 'Test',
      type: 'ovin',
      scaleValue: 10,
      wilayaCode: '16',
      objective: 'Tester',
    });
    await useCourse.getState().load();
  });

  it('annonce clairement un contenu indisponible au lieu de planter', async () => {
    await renderApp('fr', '/jour/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contenu indisponible' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/jour 1/i)).toBeInTheDocument();
  });
});
