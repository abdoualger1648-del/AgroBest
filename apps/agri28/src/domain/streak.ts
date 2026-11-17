/** Date locale au format YYYY-MM-DD (la série se compte en jours vécus). */
export function toDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function previousDay(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return toDayKey(date.getTime());
}

export interface Streak {
  current: number;
  best: number;
  lastActiveDay: string | null;
}

/**
 * Série d'activité. Mode libre oblige : la série est informative, jamais
 * bloquante. Elle reste « vivante » si la dernière activité date d'aujourd'hui
 * ou d'hier, pour ne pas punir quelqu'un qui travaille le soir tard.
 */
export function computeStreak(completionTimestamps: readonly number[], now: number): Streak {
  const days = [...new Set(completionTimestamps.map(toDayKey))].sort();
  if (days.length === 0) return { current: 0, best: 0, lastActiveDay: null };

  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    const isConsecutive = previousDay(days[index] ?? '') === days[index - 1];
    run = isConsecutive ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const today = toDayKey(now);
  const yesterday = previousDay(today);
  const lastActiveDay = days[days.length - 1] ?? null;

  let current = 0;
  if (lastActiveDay === today || lastActiveDay === yesterday) {
    current = 1;
    for (let index = days.length - 1; index > 0; index -= 1) {
      if (previousDay(days[index] ?? '') === days[index - 1]) current += 1;
      else break;
    }
  }

  return { current, best: Math.max(best, current), lastActiveDay };
}
