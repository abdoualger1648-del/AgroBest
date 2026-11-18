import { create } from 'zustand';
import type { Lesson } from '@/content/schema';
import type { Lang } from '@/lib/lang';
import { dossierDraftsFor } from '@/domain/dossier';
import type { DayProgress, Project } from '@/domain/types';
import { computeStreak, type Streak } from '@/domain/streak';
import {
  createProject as dbCreateProject,
  getActiveProject,
  updateProject as dbUpdateProject,
  type ProjectInput,
} from '@/db/repositories/project';
import {
  completeDay as dbCompleteDay,
  listProgress,
  saveDayProgress,
  startDay as dbStartDay,
  unlockDay as dbUnlockDay,
  type CompleteDayInput,
  type DayPatch,
} from '@/db/repositories/progress';
import {
  countDossierItems,
  deleteDossierItem as dbDeleteDossierItem,
  listDossier,
  saveDossierDrafts,
} from '@/db/repositories/dossier';
import {
  deletePrompt as dbDeletePrompt,
  listPrompts,
  recordPrompt as dbRecordPrompt,
  updatePrompt as dbUpdatePrompt,
  type PromptPatch,
  type RecordPromptInput,
} from '@/db/repositories/notebook';
import { awardBadges, listBadges } from '@/db/repositories/badges';
import type { BadgeId, BadgeRecord, DossierItem, PromptEntry } from '@/domain/types';

interface CourseState {
  project: Project | null;
  progress: DayProgress[];
  dossier: DossierItem[];
  prompts: PromptEntry[];
  badges: BadgeRecord[];
  /** Badges obtenus à la dernière validation, à annoncer puis à acquitter. */
  freshBadges: BadgeId[];
  dossierCount: number;
  /** Série recalculée à chaque écriture : jamais pendant le rendu (Date.now() n'est pas pur). */
  streak: Streak;
  loaded: boolean;
  load: () => Promise<void>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>;
  startDay: (day: number) => Promise<void>;
  saveDay: (day: number, patch: DayPatch) => Promise<void>;
  unlockDay: (day: number) => Promise<void>;
  completeDay: (day: number, lesson: Lesson, lang: Lang, input: CompleteDayInput) => Promise<void>;
  acknowledgeBadges: () => void;
  recordPrompt: (input: Omit<RecordPromptInput, 'projectId'>) => Promise<void>;
  updatePrompt: (id: string, patch: PromptPatch) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  deleteDossierItem: (id: string) => Promise<void>;
}

async function readAll(
  projectId: string,
): Promise<
  Pick<CourseState, 'progress' | 'dossier' | 'prompts' | 'badges' | 'dossierCount' | 'streak'>
> {
  const [progress, dossier, prompts, badges, dossierCount] = await Promise.all([
    listProgress(projectId),
    listDossier(projectId),
    listPrompts(projectId),
    listBadges(projectId),
    countDossierItems(projectId),
  ]);
  return {
    progress,
    dossier,
    prompts,
    badges,
    dossierCount,
    streak: computeStreak(completionTimes(progress), Date.now()),
  };
}

const EMPTY: Pick<CourseState, 'progress' | 'dossier' | 'prompts' | 'badges' | 'dossierCount'> = {
  progress: [],
  dossier: [],
  prompts: [],
  badges: [],
  dossierCount: 0,
};

const EMPTY_STREAK: Streak = { current: 0, best: 0, lastActiveDay: null };

export const useCourse = create<CourseState>((set, get) => ({
  project: null,
  ...EMPTY,
  freshBadges: [],
  streak: EMPTY_STREAK,
  loaded: false,

  load: async () => {
    const project = await getActiveProject();
    if (!project) {
      set({ project: null, ...EMPTY, freshBadges: [], streak: EMPTY_STREAK, loaded: true });
      return;
    }
    set({ project, ...(await readAll(project.id)), loaded: true });
  },

  createProject: async (input) => {
    const project = await dbCreateProject(input);
    set({ project, ...(await readAll(project.id)) });
    return project;
  },

  updateProject: async (patch) => {
    const { project } = get();
    if (!project) return;
    set({ project: await dbUpdateProject(project.id, patch) });
  },

  startDay: async (day) => {
    const { project } = get();
    if (!project) return;
    await dbStartDay(project.id, day);
    set(await readAll(project.id));
  },

  saveDay: async (day, patch) => {
    const { project } = get();
    if (!project) return;
    await saveDayProgress(project.id, day, patch);
    set(await readAll(project.id));
  },

  unlockDay: async (day) => {
    const { project } = get();
    if (!project) return;
    await dbUnlockDay(project.id, day);
    set(await readAll(project.id));
  },

  completeDay: async (day, lesson, lang, input) => {
    const { project } = get();
    if (!project) return;

    const captures = {
      ...(get().progress.find((entry) => entry.day === day)?.captures ?? {}),
      ...input.captures,
    };
    const drafts = dossierDraftsFor(lesson, captures);
    if (drafts.length > 0) {
      await saveDossierDrafts(project.id, day, lesson.id, lang, drafts);
    }
    await dbCompleteDay(project.id, day, input);

    const state = await readAll(project.id);
    const fresh = await awardBadges(project.id, state.progress);
    set({
      ...state,
      ...(fresh.length > 0 ? { badges: await listBadges(project.id), freshBadges: fresh } : {}),
    });
  },

  acknowledgeBadges: () => {
    set({ freshBadges: [] });
  },

  recordPrompt: async (input) => {
    const { project } = get();
    if (!project) return;
    await dbRecordPrompt({ ...input, projectId: project.id });
    set({ prompts: await listPrompts(project.id) });
  },

  updatePrompt: async (id, patch) => {
    const { project } = get();
    if (!project) return;
    await dbUpdatePrompt(id, patch);
    set({ prompts: await listPrompts(project.id) });
  },

  deletePrompt: async (id) => {
    const { project } = get();
    if (!project) return;
    await dbDeletePrompt(id);
    set({ prompts: await listPrompts(project.id) });
  },

  deleteDossierItem: async (id) => {
    const { project } = get();
    if (!project) return;
    await dbDeleteDossierItem(id);
    set(await readAll(project.id));
  },
}));

// ——— sélecteurs ———
//
// IMPORTANT : un sélecteur passé à useCourse() doit renvoyer une référence
// STABLE. Tout calcul qui construit un nouvel objet (résumé, série, statuts)
// se fait avec useMemo dans le composant, à partir de `progress`, sinon
// useSyncExternalStore boucle à l'infini.

export function selectProgress(state: CourseState): DayProgress[] {
  return state.progress;
}

export function selectDayProgress(state: CourseState, day: number): DayProgress | undefined {
  return state.progress.find((entry) => entry.day === day);
}

/** Dates de validation, pour le calcul de la série. */
export function completionTimes(progress: readonly DayProgress[]): number[] {
  return progress
    .filter((entry) => entry.status === 'done' && entry.completedAt !== undefined)
    .map((entry) => entry.completedAt as number);
}
