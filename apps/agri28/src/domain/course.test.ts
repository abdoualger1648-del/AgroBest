import { describe, expect, it } from 'vitest';
import { makeProgress } from '@/test/factories';
import { completedWeeks, computeDayStatuses, currentDay, isDayOpen, summarize } from './course';

describe('parcours (mode libre)', () => {
  it('ouvre le jour 1 et verrouille le reste au démarrage', () => {
    const statuses = computeDayStatuses([]);
    expect(statuses.get(1)).toBe('available');
    expect(statuses.get(2)).toBe('locked');
    expect(statuses.get(28)).toBe('locked');
  });

  it('ouvre le jour suivant dès que le précédent est validé, sans attendre demain', () => {
    const statuses = computeDayStatuses([makeProgress(1)]);
    expect(statuses.get(1)).toBe('done');
    expect(statuses.get(2)).toBe('available');
    expect(statuses.get(3)).toBe('locked');
  });

  it('laisse enchaîner plusieurs jours dans la même session', () => {
    const statuses = computeDayStatuses([makeProgress(1), makeProgress(2), makeProgress(3)]);
    expect(statuses.get(4)).toBe('available');
    expect(statuses.get(5)).toBe('locked');
  });

  it('marque « en cours » un jour commencé mais non validé', () => {
    const statuses = computeDayStatuses([
      makeProgress(1, { status: 'in_progress', completedAt: undefined }),
    ]);
    expect(statuses.get(1)).toBe('in_progress');
    expect(statuses.get(2)).toBe('locked');
  });

  it('respecte un déverrouillage manuel', () => {
    const progress = [
      makeProgress(5, { status: 'in_progress', unlocked: true, completedAt: undefined }),
    ];
    expect(computeDayStatuses(progress).get(5)).toBe('in_progress');
    expect(isDayOpen(5, progress)).toBe(true);
    expect(isDayOpen(6, progress)).toBe(false);
  });

  it('désigne le jour à reprendre', () => {
    expect(currentDay([])).toBe(1);
    expect(currentDay([makeProgress(1)])).toBe(2);
    expect(
      currentDay([
        makeProgress(1),
        makeProgress(2, { status: 'in_progress', completedAt: undefined }),
      ]),
    ).toBe(2);
  });

  it('résume la progression', () => {
    const summary = summarize([makeProgress(1), makeProgress(2)]);
    expect(summary.daysDone).toBe(2);
    expect(summary.totalDays).toBe(28);
    expect(summary.ratio).toBeCloseTo(2 / 28);
    expect(summary.currentDay).toBe(3);
    expect(summary.currentWeek).toBe(1);
    expect(summary.weekDaysDone).toBe(2);
    expect(summary.allDone).toBe(false);
  });

  it('reconnaît un parcours terminé', () => {
    const all = Array.from({ length: 28 }, (_, index) => makeProgress(index + 1));
    const summary = summarize(all);
    expect(summary.daysDone).toBe(28);
    expect(summary.allDone).toBe(true);
    expect(completedWeeks(all)).toEqual([1, 2, 3, 4]);
  });

  it('ne valide une semaine que lorsque ses 7 jours sont faits', () => {
    const six = Array.from({ length: 6 }, (_, index) => makeProgress(index + 1));
    expect(completedWeeks(six)).toEqual([]);
    expect(completedWeeks([...six, makeProgress(7)])).toEqual([1]);
  });
});
