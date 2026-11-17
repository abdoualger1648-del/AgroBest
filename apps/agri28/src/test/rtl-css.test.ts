import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou RTL (CLAUDE.md §4) : aucune propriété ni aucun utilitaire
 * directionnel « physique » dans src/. Tout doit être logique, pour que
 * l'arabe fonctionne sans feuille de style miroir.
 *
 * Échappatoire : ajouter `rtl-ok` en commentaire sur la ligne, quand la
 * direction physique est réellement voulue (par ex. transform: scaleX(-1)).
 */
const FORBIDDEN: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /\b(?:margin|padding|border)-(?:left|right)\b/, why: 'propriété CSS physique' },
  {
    pattern: /(?:^|[;{\s])(?:left|right)\s*:/,
    why: 'décalage CSS physique (utiliser inset-inline)',
  },
  { pattern: /text-align\s*:\s*(?:left|right)/, why: 'alignement physique (utiliser start/end)' },
  { pattern: /\bfloat\s*:\s*(?:left|right)/, why: 'float physique' },
  {
    pattern: /(?:^|["'\s])(?:ml|mr|pl|pr)-\d/,
    why: 'utilitaire Tailwind physique (utiliser ms-/me-/ps-/pe-)',
  },
  {
    pattern: /(?:^|["'\s])(?:left|right)-\d/,
    why: 'utilitaire Tailwind physique (utiliser start-/end-)',
  },
  {
    pattern: /\btext-(?:left|right)\b/,
    why: 'utilitaire Tailwind physique (utiliser text-start/text-end)',
  },
  { pattern: /(?:^|["'\s])border-[lr]-\d/, why: 'bordure physique (utiliser border-s/border-e)' },
  { pattern: /(?:^|["'\s])rounded-[lr]\b/, why: 'arrondi physique (utiliser rounded-s/rounded-e)' },
  { pattern: /(?:^|["'\s])inset-x-\d/, why: 'préférer start-/end- pour une direction explicite' },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx?|css)$/.test(entry)) files.push(full);
  }
  return files;
}

describe('garde-fou RTL', () => {
  const root = join(import.meta.dirname, '..');
  const files = walk(root).filter((file) => !file.endsWith('rtl-css.test.ts'));

  it('analyse bien les sources de l’application', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('n’utilise aucune propriété ni aucun utilitaire directionnel physique', () => {
    const offences: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (line.includes('rtl-ok')) return;
        for (const { pattern, why } of FORBIDDEN) {
          if (pattern.test(line)) {
            offences.push(`${relative(root, file)}:${index + 1} — ${why} → ${line.trim()}`);
          }
        }
      });
    }

    expect(offences, offences.join('\n')).toEqual([]);
  });
});
