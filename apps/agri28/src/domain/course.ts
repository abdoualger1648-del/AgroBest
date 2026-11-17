import { TOTAL_DAYS, weekOf, type DayProgress, type DayStatus } from './types';

/**
 * Règle de déverrouillage — mode LIBRE (décision D3) :
 * le jour 1 est toujours ouvert, et le jour N s'ouvre dès que le jour N−1 est
 * validé. Aucune attente d'un jour calendaire. Un jour peut aussi être ouvert
 * manuellement (progress.unlocked), parce que bloquer un adulte sur un contenu
 * qu'il maîtrise déjà est contre-productif.
 */
export function computeDayStatuses(
  progress: readonly DayProgress[],
  totalDays: number = TOTAL_DAYS,
): Map<number, DayStatus> {
  const byDay = new Map(progress.map((entry) => [entry.day, entry]));
  const statuses = new Map<number, DayStatus>();

  for (let day = 1; day <= totalDays; day += 1) {
    const entry = byDay.get(day);
    if (entry?.status === 'done') {
      statuses.set(day, 'done');
      continue;
    }

    const previousDone = day === 1 || byDay.get(day - 1)?.status === 'done';
    const reachable = previousDone || entry?.unlocked === true;

    if (!reachable) {
      statuses.set(day, 'locked');
      continue;
    }
    statuses.set(day, entry?.status === 'in_progress' ? 'in_progress' : 'available');
  }

  return statuses;
}

export function isDayOpen(
  day: number,
  progress: readonly DayProgress[],
  totalDays: number = TOTAL_DAYS,
): boolean {
  return computeDayStatuses(progress, totalDays).get(day) !== 'locked';
}

/** Jour sur lequel l'utilisateur doit reprendre : le premier ouvert non validé. */
export function currentDay(
  progress: readonly DayProgress[],
  totalDays: number = TOTAL_DAYS,
): number {
  const statuses = computeDayStatuses(progress, totalDays);
  for (let day = 1; day <= totalDays; day += 1) {
    const status = statuses.get(day);
    if (status === 'in_progress' || status === 'available') return day;
  }
  return totalDays;
}

export interface CourseSummary {
  daysDone: number;
  totalDays: number;
  ratio: number;
  currentDay: number;
  currentWeek: number;
  weekDaysDone: number;
  allDone: boolean;
}

export function summarize(
  progress: readonly DayProgress[],
  totalDays: number = TOTAL_DAYS,
): CourseSummary {
  const daysDone = progress.filter((entry) => entry.status === 'done').length;
  const day = currentDay(progress, totalDays);
  const week = weekOf(day);
  const weekDaysDone = progress.filter(
    (entry) => entry.status === 'done' && weekOf(entry.day) === week,
  ).length;

  return {
    daysDone,
    totalDays,
    ratio: totalDays === 0 ? 0 : daysDone / totalDays,
    currentDay: day,
    currentWeek: week,
    weekDaysDone,
    allDone: daysDone >= totalDays,
  };
}

/** Semaines entièrement validées : sert aux badges de fin de semaine (phase 5). */
export function completedWeeks(progress: readonly DayProgress[]): number[] {
  const weeks: number[] = [];
  for (let week = 1; week <= 4; week += 1) {
    const done = progress.filter(
      (entry) => entry.status === 'done' && weekOf(entry.day) === week,
    ).length;
    if (done === 7) weeks.push(week);
  }
  return weeks;
}
