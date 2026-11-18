import { db } from '../db';
import { newlyEarned } from '@/domain/badges';
import type { BadgeId, BadgeRecord, DayProgress } from '@/domain/types';

function badgeId(projectId: string, badge: BadgeId): string {
  return `${projectId}:${badge}`;
}

export async function listBadges(projectId: string): Promise<BadgeRecord[]> {
  const badges = await db.badges.where('projectId').equals(projectId).toArray();
  return badges.sort((a, b) => a.earnedAt - b.earnedAt);
}

/**
 * Enregistre les badges nouvellement mérités et renvoie uniquement ceux-ci,
 * pour que l'interface puisse les annoncer.
 */
export async function awardBadges(
  projectId: string,
  progress: readonly DayProgress[],
): Promise<BadgeId[]> {
  const existing = await listBadges(projectId);
  const fresh = newlyEarned(
    progress,
    existing.map((record) => record.badge),
  );
  if (fresh.length === 0) return [];

  const now = Date.now();
  await db.badges.bulkPut(
    fresh.map((badge) => ({ id: badgeId(projectId, badge), projectId, badge, earnedAt: now })),
  );
  return fresh;
}

export async function clearBadges(projectId: string): Promise<void> {
  await db.badges.where('projectId').equals(projectId).delete();
}
