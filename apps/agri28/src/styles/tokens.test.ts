import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';

/**
 * Les jetons de couleur sont lus directement dans la feuille de styles :
 * le test suit donc le fichier réel, pas une copie qui dériverait.
 */
function readTokens(block: string): Record<string, string> {
  const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf8');
  const start = css.indexOf(block);
  if (start === -1) throw new Error(`Bloc introuvable : ${block}`);
  const body = css.slice(start + block.length, css.indexOf('}', start));

  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/--(c-[\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    tokens[match[1] ?? ''] = match[2] ?? '';
  }
  return tokens;
}

const themes = {
  clair: readTokens(':root {'),
  sombre: readTokens("[data-theme='dark'] {"),
};

/** Paires réellement utilisées dans l'interface, avec le seuil WCAG qui s'applique. */
const TEXT_PAIRS: [string, string, string][] = [
  ['texte sur fond', 'c-fg', 'c-bg'],
  ['texte sur surface', 'c-fg', 'c-surface'],
  ['texte atténué sur fond', 'c-muted', 'c-bg'],
  ['texte atténué sur surface', 'c-muted', 'c-surface'],
  ['texte atténué sur surface secondaire', 'c-muted', 'c-surface-2'],
  ['texte du bouton principal', 'c-on-primary', 'c-primary'],
  ['lien et accent sur fond', 'c-primary', 'c-bg'],
  ['lien et accent sur surface', 'c-primary', 'c-surface'],
  ['erreur sur fond', 'c-danger', 'c-bg'],
  ['succès sur fond', 'c-success', 'c-bg'],
  ['avertissement sur fond', 'c-warning', 'c-bg'],
];

/** Éléments d'interface non textuels : seuil 3:1. */
const UI_PAIRS: [string, string, string][] = [
  ['anneau de focus sur fond', 'c-focus', 'c-bg'],
  ['anneau de focus sur surface', 'c-focus', 'c-surface'],
  ['barre de progression', 'c-primary', 'c-surface-2'],
];

describe('contraste des couleurs', () => {
  for (const [themeName, tokens] of Object.entries(themes)) {
    describe(`thème ${themeName}`, () => {
      it('définit tous les jetons attendus', () => {
        for (const token of ['c-bg', 'c-surface', 'c-surface-2', 'c-fg', 'c-muted', 'c-primary']) {
          expect(tokens[token], token).toMatch(/^#/);
        }
      });

      for (const [label, foreground, background] of TEXT_PAIRS) {
        it(`respecte AA (4,5:1) — ${label}`, () => {
          const ratio = contrastRatio(tokens[foreground] ?? '', tokens[background] ?? '');
          expect(ratio, `${label} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        });
      }

      for (const [label, foreground, background] of UI_PAIRS) {
        it(`respecte AA pour un élément d'interface (3:1) — ${label}`, () => {
          const ratio = contrastRatio(tokens[foreground] ?? '', tokens[background] ?? '');
          expect(ratio, `${label} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }
});

describe('calcul du contraste', () => {
  it('donne les valeurs de référence', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Valeur publiée par les outils WCAG pour ce couple.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });
});
