/**
 * Lève le drapeau « brouillon » d'une variante, après relecture humaine.
 *
 *   npm run variantes:valider -- --jours 8-14 --niveau tous
 *   npm run variantes:valider -- --jours 21 --type apiculture
 *
 * Ce script ne juge rien et ne corrige rien : il retire un drapeau, dans les
 * DEUX langues à la fois, pour les jours que vous nommez. C'est vous qui avez
 * lu les textes ; lui ne fait que vous épargner des dizaines d'éditions à la
 * main, qui seraient elles-mêmes une source d'erreurs.
 *
 * Les jours doivent être nommés explicitement : il n'y a pas de « tout
 * valider », parce que ce serait exactement le tampon que D82 cherche à
 * éviter.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyserJours,
  leverBrouillons,
  niveauxGenerables,
} from '../../src/content/generationVariantes.ts';
import { PROJECT_TYPES } from '../../src/domain/types.ts';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dossierJours = join(racine, 'content', 'days');

function argument(nom: string): string | undefined {
  const index = process.argv.indexOf(`--${nom}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function abandonner(message: string): never {
  console.error(message);
  process.exit(1);
}

const USAGE = `Usage :
  npm run variantes:valider -- --jours <8-14 | 3,7,21> --niveau <${niveauxGenerables().join('|')}|tous>
  npm run variantes:valider -- --jours <…> --type <${PROJECT_TYPES.join('|')}|tous>

Retire « "brouillon": true » dans les deux langues, pour les jours nommés.
Les jours sont toujours nommés explicitement : il n'y a pas de « tout valider ».`;

const joursBruts = argument('jours');
const niveau = argument('niveau');
const type = argument('type');

if (!joursBruts || (!niveau && !type)) abandonner(USAGE);
if (niveau && type) abandonner(`Un seul axe à la fois.\n\n${USAGE}`);

let jours: number[];
try {
  jours = analyserJours(joursBruts);
} catch (erreur) {
  abandonner(`--jours : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
}

const champ = niveau ? 'variantesNiveau' : 'variantes';
const demande = (niveau ?? type) as string;
const connus: readonly string[] = niveau ? niveauxGenerables() : PROJECT_TYPES;
if (demande !== 'tous' && !connus.includes(demande)) {
  abandonner(`Inconnu : « ${demande} ». Attendu : ${connus.join(', ')} ou « tous ».`);
}

let leves = 0;
const restants: string[] = [];

for (const jour of jours) {
  for (const langue of ['fr', 'ar'] as const) {
    const chemin = join(dossierJours, `day-${String(jour).padStart(2, '0')}.${langue}.json`);
    const brut = JSON.parse(await readFile(chemin, 'utf8')) as Record<string, unknown>;

    // Toute la décision est dans `leverBrouillons`, éprouvée par des tests :
    // ce script ne fait que lire, appeler, et écrire.
    const resultat = leverBrouillons(brut, champ, demande);
    if (resultat.leves.length > 0) {
      await writeFile(chemin, `${JSON.stringify(resultat.lecon, null, 2)}\n`, 'utf8');
      for (const cle of resultat.leves) {
        console.log(`  levé : jour ${String(jour)} · ${langue} · ${cle}`);
      }
      leves += resultat.leves.length;
    }
    for (const cle of resultat.restants) {
      restants.push(`jour ${String(jour)} · ${langue} · ${cle}`);
    }
  }
}

if (leves === 0) {
  console.log('Aucun brouillon à lever pour cette demande.');
} else {
  console.log(`\n${String(leves)} drapeau(x) levé(s). Ces variantes sont désormais affichées.`);
}
if (restants.length > 0) {
  console.log(`\nEncore en brouillon sur ces jours : ${String(restants.length)}`);
}
console.log(`
À faire ensuite :
  npx prettier --write 'content/days/day-*.json'
  npm run validate:content && npm run test`);
