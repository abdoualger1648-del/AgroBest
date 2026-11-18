/**
 * Budget de poids du paquet, mesuré sur `dist/` après `npm run build`.
 *
 * Trois garde-fous, chacun avec un plafond volontairement serré pour qu'une
 * régression se voie tout de suite sur un téléphone en connexion faible :
 *   1. le chargement initial (HTML + entrée + ses imports statiques + CSS) ;
 *   2. le pré-cache du service worker (ce que la première visite télécharge) ;
 *   3. l'absence des bibliothèques d'export et des jours 8 à 28 du pré-cache
 *      (décision D32 : ils sont mis en cache au premier usage).
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

/** Plafonds en kibioctets, taille gzip. */
const BUDGETS = {
  initial: 180,
  precache: 400,
};

const fail = [];
const lines = [];

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ absent : lancez `npm run build` avant `npm run check:bundle`.');
  process.exit(1);
}

const gzipKiB = (file) => {
  const abs = path.join(DIST, file);
  if (!existsSync(abs)) {
    fail.push(`fichier référencé par index.html mais absent de dist/ : ${file}`);
    return 0;
  }
  return gzipSync(readFileSync(abs)).length / 1024;
};

// 1. Chargement initial.
const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
const initialFiles = new Set(['index.html']);
for (const match of html.matchAll(/(?:src|href)="\/WinBest\/([^"]+\.(?:js|css))"/g)) {
  initialFiles.add(match[1]);
}

let initial = 0;
for (const file of initialFiles) initial += gzipKiB(file);
lines.push(`chargement initial  ${initial.toFixed(1)} Ko gzip  (${initialFiles.size} fichiers, plafond ${BUDGETS.initial} Ko)`);
if (initial > BUDGETS.initial) {
  fail.push(`chargement initial ${initial.toFixed(1)} Ko > ${BUDGETS.initial} Ko`);
}

// 2 et 3. Pré-cache du service worker.
const sw = readFileSync(path.join(DIST, 'sw.js'), 'utf8');
const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
if (precached.length === 0) {
  fail.push('aucune entrée de pré-cache trouvée dans sw.js : le format a changé.');
}

let precache = 0;
for (const url of precached) precache += gzipKiB(url.replace(/^\//, ''));
lines.push(`pré-cache           ${precache.toFixed(1)} Ko gzip  (${precached.length} entrées, plafond ${BUDGETS.precache} Ko)`);
if (precache > BUDGETS.precache) {
  fail.push(`pré-cache ${precache.toFixed(1)} Ko > ${BUDGETS.precache} Ko`);
}

const interdits = precached.filter((url) =>
  /export-|firebase-|day-(?:0[89]|1\d|2[0-8])\./.test(url),
);
if (interdits.length > 0) {
  fail.push(`pré-caché alors que les décisions D32 et D57 l'excluent : ${interdits.join(', ')}`);
}

// Contre-épreuve : la semaine 1 doit bien être pré-cachée, sinon le test
// ci-dessus passerait aussi avec un pré-cache vide de toute leçon.
const semaine1 = precached.filter((url) => /day-0[1-7]\./.test(url));
if (semaine1.length !== 14) {
  fail.push(`semaine 1 attendue au pré-cache : 14 fichiers (7 jours × 2 langues), trouvé ${semaine1.length}`);
}
lines.push(`semaine 1 pré-cachée ${semaine1.length} / 14 fichiers`);

console.log(lines.join('\n'));
if (fail.length > 0) {
  console.error('\nBudget dépassé :');
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nBudget respecté.');
