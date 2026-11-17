import { describe, expect, it } from 'vitest';
import { formatDA, formatDate, formatDuration, formatNumber, formatPercent } from './format';

/** Les locales utilisent des espaces insécables : on les normalise pour comparer. */
const plain = (value: string) => value.replace(/[\u00a0\u202f\u200f\u200e]/g, ' ');

describe('formatage', () => {
  it('écrit les nombres en chiffres occidentaux dans les deux langues', () => {
    expect(plain(formatNumber(1500, 'fr'))).toBe('1 500');
    // ar-DZ sépare les milliers par un point (CLDR) : on suit la locale.
    expect(plain(formatNumber(1500, 'ar'))).toBe('1.500');
    // Le point essentiel : des chiffres occidentaux, pas arabo-indiens.
    expect(formatNumber(42, 'ar')).toMatch(/^\d+$/);
    expect(formatNumber(1500, 'ar')).not.toMatch(/[\u0660-\u0669]/);
  });

  it('formate les montants en dinars avec le suffixe de la langue', () => {
    expect(plain(formatDA(1500, 'fr'))).toBe('1 500 DA');
    expect(plain(formatDA(1500, 'ar'))).toBe('1.500 د.ج');
    expect(plain(formatDA(1200000, 'fr'))).toBe('1 200 000 DA');
  });

  it('formate les dates dans la langue demandée', () => {
    const date = new Date(Date.UTC(2026, 10, 17));
    expect(formatDate(date, 'fr')).toContain('2026');
    expect(formatDate(date, 'ar')).toContain('2026');
    expect(formatDate(date, 'fr')).not.toBe(formatDate(date, 'ar'));
  });

  it('formate la durée du minuteur', () => {
    expect(formatDuration(900)).toBe('15:00');
    expect(formatDuration(59)).toBe('00:59');
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(61.7)).toBe('01:01');
  });

  it('formate les pourcentages', () => {
    expect(plain(formatPercent(0.25, 'fr'))).toContain('25');
    expect(plain(formatPercent(0.25, 'ar'))).toContain('25');
  });
});
