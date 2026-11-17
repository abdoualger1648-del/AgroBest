import { describe, expect, it } from 'vitest';
import { computeStreak, toDayKey } from './streak';

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();

describe('série', () => {
  it('vaut zéro sans activité', () => {
    expect(computeStreak([], day(2026, 11, 17))).toEqual({
      current: 0,
      best: 0,
      lastActiveDay: null,
    });
  });

  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    const streak = computeStreak(
      [day(2026, 11, 15), day(2026, 11, 16), day(2026, 11, 17)],
      day(2026, 11, 17, 20),
    );
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
    expect(streak.lastActiveDay).toBe(toDayKey(day(2026, 11, 17)));
  });

  it('reste vivante si la dernière activité date d’hier', () => {
    expect(
      computeStreak([day(2026, 11, 15), day(2026, 11, 16)], day(2026, 11, 17, 9)).current,
    ).toBe(2);
  });

  it('retombe à zéro après deux jours sans rien faire', () => {
    const streak = computeStreak([day(2026, 11, 14), day(2026, 11, 15)], day(2026, 11, 18));
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(2);
  });

  it('ne compte qu’une fois plusieurs journées validées le même jour', () => {
    const streak = computeStreak(
      [day(2026, 11, 17, 9), day(2026, 11, 17, 14), day(2026, 11, 17, 21)],
      day(2026, 11, 17, 22),
    );
    expect(streak.current).toBe(1);
  });

  it('retient le meilleur enchaînement passé', () => {
    const streak = computeStreak(
      [
        day(2026, 11, 1),
        day(2026, 11, 2),
        day(2026, 11, 3),
        day(2026, 11, 4),
        day(2026, 11, 16),
        day(2026, 11, 17),
      ],
      day(2026, 11, 17, 23),
    );
    expect(streak.current).toBe(2);
    expect(streak.best).toBe(4);
  });

  it('gère un changement de mois', () => {
    expect(computeStreak([day(2026, 10, 31), day(2026, 11, 1)], day(2026, 11, 1, 23)).current).toBe(
      2,
    );
  });
});
