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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

/** Plafonds en kibioctets, taille gzip. */
const BUDGETS = {
  initial: 180,
  precache: 400,
};

/**
 * L'édition construite, lue dans la même variable que le build. La vitrine
 * n'embarque que les trois premières leçons : c'est une promesse faite à
 * l'utilisateur du projet, donc elle se vérifie, elle ne se suppose pas.
 */
const EDITION = process.env.VITE_EDITION ?? 'complete';
const VITRINE = EDITION === 'vitrine';

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
for (const match of html.matchAll(/(?:src|href)="\/AgroBest\/([^"]+\.(?:js|css))"/g)) {
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

// Contre-épreuve : les leçons attendues doivent bien être pré-cachées, sinon
// le test ci-dessus passerait aussi avec un pré-cache vide de toute leçon.
const attendues = VITRINE ? 6 : 14;
const libelle = VITRINE ? 'leçons 1 à 3' : 'semaine 1';
const motif = VITRINE ? /day-0[1-3]\./ : /day-0[1-7]\./;
const presentes = precached.filter((url) => motif.test(url));
if (presentes.length !== attendues) {
  fail.push(
    `pré-cache, ${libelle} : ${attendues} fichiers attendus, trouvé ${presentes.length}`,
  );
}
lines.push(`pré-cache, ${libelle}  ${presentes.length} / ${attendues} fichiers`);

// En vitrine, les leçons 4 à 28 ne doivent exister NULLE PART dans dist/ :
// les masquer dans l'interface les laisserait téléchargeables.
if (VITRINE) {
  const fichiers = readdirSync(path.join(DIST, 'assets'));
  const fuites = fichiers.filter((nom) => /day-(?:0[4-9]|1\d|2[0-8])\./.test(nom));
  if (fuites.length > 0) {
    fail.push(`leçons hors vitrine présentes dans dist/ : ${fuites.join(', ')}`);
  }
  const construites = new Set(
    fichiers.flatMap((nom) => /day-(\d{2})\.(?:fr|ar)[.-]/.exec(nom)?.slice(1, 2) ?? []),
  );
  lines.push(`vitrine : jours construits ${[...construites].sort().join(', ')}`);
}

console.log(`édition            ${EDITION}`);
console.log(lines.join('\n'));
if (fail.length > 0) {
  console.error('\nBudget dépassé :');
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nBudget respecté.');
