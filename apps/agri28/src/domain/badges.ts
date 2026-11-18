import { completedWeeks } from './course';
import { BADGE_IDS, TOTAL_DAYS, type BadgeId, type DayProgress } from './types';

/**
 * Badges mérités d'après la progression. Un badge de semaine s'obtient quand
 * les 7 jours de la semaine sont validés ; le badge final quand les 28 le sont.
 * Fonction pure : la persistance est faite par le repository.
 */
export function earnedBadges(progress: readonly DayProgress[]): BadgeId[] {
  const badges: BadgeId[] = completedWeeks(progress).map((week) => `week-${week}` as BadgeId);
  const daysDone = progress.filter((entry) => entry.status === 'done').length;
  if (daysDone >= TOTAL_DAYS) badges.push('final');
  return badges;
}

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === 'string' && (BADGE_IDS as readonly string[]).includes(value);
}

/** Badges mérités mais pas encore enregistrés. */
export function newlyEarned(
  progress: readonly DayProgress[],
  alreadyEarned: readonly BadgeId[],
): BadgeId[] {
  const known = new Set(alreadyEarned);
  return earnedBadges(progress).filter((badge) => !known.has(badge));
}
