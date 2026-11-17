import { describe, expect, it } from 'vitest';
import { NAMESPACES, resources } from './index';

type Flat = Record<string, string>;

function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (typeof value === 'string') {
    out[prefix] = value;
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

describe('traductions', () => {
  it('expose les mêmes espaces de noms dans les deux langues', () => {
    expect(Object.keys(resources.fr).sort()).toEqual([...NAMESPACES].sort());
    expect(Object.keys(resources.ar).sort()).toEqual([...NAMESPACES].sort());
  });

  for (const ns of NAMESPACES) {
    it(`a les mêmes clés en FR et en AR pour « ${ns} »`, () => {
      const fr = Object.keys(flatten(resources.fr[ns])).sort();
      const ar = Object.keys(flatten(resources.ar[ns])).sort();
      expect(ar).toEqual(fr);
    });

    it(`n’a aucune valeur vide pour « ${ns} »`, () => {
      for (const lang of ['fr', 'ar'] as const) {
        for (const [key, value] of Object.entries(flatten(resources[lang][ns]))) {
          expect(value.trim(), `${lang}:${ns}:${key}`).not.toBe('');
        }
      }
    });

    it(`utilise les mêmes variables d’interpolation pour « ${ns} »`, () => {
      const fr = flatten(resources.fr[ns]);
      const ar = flatten(resources.ar[ns]);
      for (const [key, frValue] of Object.entries(fr)) {
        expect(placeholders(ar[key] ?? ''), `${ns}:${key}`).toEqual(placeholders(frValue));
      }
    });
  }

  it('traduit réellement en arabe (pas de copie du français)', () => {
    expect(resources.ar.nav.home).not.toBe(resources.fr.nav.home);
    expect(resources.ar.settings.title).not.toBe(resources.fr.settings.title);
    expect(resources.ar.nav.home).toMatch(/[؀-ۿ]/);
  });
});
