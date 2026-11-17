import { db } from '../db';
import { weekOf, type DayProgress, type QuizResult } from '@/domain/types';

function progressId(projectId: string, day: number): string {
  return `${projectId}:${String(day).padStart(2, '0')}`;
}

function blank(projectId: string, day: number, now: number): DayProgress {
  return {
    id: progressId(projectId, day),
    projectId,
    day,
    week: weekOf(day),
    status: 'in_progress',
    unlocked: false,
    startedAt: now,
    timeSpentSec: 0,
    sectionsDone: { concept: false, practice: false, quiz: false, review: false },
    captures: {},
  };
}

export async function listProgress(projectId: string): Promise<DayProgress[]> {
  return db.progress.where('projectId').equals(projectId).sortBy('day');
}

export async function getDayProgress(
  projectId: string,
  day: number,
): Promise<DayProgress | undefined> {
  return db.progress.get(progressId(projectId, day));
}

/** Ouvre la journée (idempotent) et la marque « en cours ». */
export async function startDay(projectId: string, day: number): Promise<DayProgress> {
  const existing = await getDayProgress(projectId, day);
  if (existing) {
    if (existing.status === 'done') return existing;
    const next: DayProgress = { ...existing, status: 'in_progress' };
    await db.progress.put(next);
    return next;
  }
  const created = blank(projectId, day, Date.now());
  await db.progress.put(created);
  return created;
}

export type DayPatch = Partial<
  Pick<
    DayProgress,
    'sectionsDone' | 'captures' | 'quiz' | 'confidence' | 'note' | 'timeSpentSec' | 'unlocked'
  >
>;

export async function saveDayProgress(
  projectId: string,
  day: number,
  patch: DayPatch,
): Promise<DayProgress> {
  const current = (await getDayProgress(projectId, day)) ?? blank(projectId, day, Date.now());
  const next: DayProgress = {
    ...current,
    ...patch,
    sectionsDone: { ...current.sectionsDone, ...patch.sectionsDone },
    captures: { ...current.captures, ...patch.captures },
  };
  await db.progress.put(next);
  return next;
}

export interface CompleteDayInput {
  quiz?: QuizResult;
  confidence?: DayProgress['confidence'];
  captures?: Record<string, string>;
  timeSpentSec?: number;
  note?: string;
}

/** Valide la journée. Rejouer une journée déjà validée ne perd pas la date initiale. */
export async function completeDay(
  projectId: string,
  day: number,
  input: CompleteDayInput = {},
): Promise<DayProgress> {
  const current = (await getDayProgress(projectId, day)) ?? blank(projectId, day, Date.now());
  const next: DayProgress = {
    ...current,
    ...input,
    captures: { ...current.captures, ...input.captures },
    sectionsDone: { concept: true, practice: true, quiz: true, review: true },
    status: 'done',
    completedAt: current.completedAt ?? Date.now(),
  };
  await db.progress.put(next);
  return next;
}

/** Ouvre un jour verrouillé à la demande explicite de l'utilisateur. */
export async function unlockDay(projectId: string, day: number): Promise<DayProgress> {
  const current = await getDayProgress(projectId, day);
  if (current) {
    const next: DayProgress = { ...current, unlocked: true };
    await db.progress.put(next);
    return next;
  }
  const created: DayProgress = { ...blank(projectId, day, Date.now()), unlocked: true };
  await db.progress.put(created);
  return created;
}

export async function completionTimestamps(projectId: string): Promise<number[]> {
  const entries = await listProgress(projectId);
  return entries
    .filter((entry) => entry.status === 'done' && entry.completedAt !== undefined)
    .map((entry) => entry.completedAt as number);
}

export async function clearProgress(projectId: string): Promise<void> {
  await db.progress.where('projectId').equals(projectId).delete();
}
