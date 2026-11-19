/**
 * Écriture assistée des variantes (phases 10 et 12).
 *
 * Deux axes, une seule commande :
 *
 *   ANTHROPIC_API_KEY=… npm run variantes -- --jour 7 --type apiculture
 *   ANTHROPIC_API_KEY=… npm run variantes -- --jour 7 --niveau debutant
 *
 * Ce que le script fait, et ce qu'il ne fait pas :
 *
 *   • il ÉCRIT un brouillon de variante, dans les deux langues, en un seul
 *     appel — c'est ce qui garantit la parité AR/FR par construction ;
 *   • il VÉRIFIE la réponse contre le schéma et contre les identifiants réels
 *     de la leçon avant d'écrire quoi que ce soit ;
 *   • il marque la variante « brouillon », et **l'application ne l'affiche
 *     pas** tant que ce drapeau est là.
 *
 * Il ne publie rien. La relecture humaine reste le seul chemin vers un
 * agriculteur : c'est précisément ce que les garde-fous du projet exigent.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonSchema, type Lesson } from '../../src/content/schema.ts';
import {
  analyserReponse,
  analyserReponseNiveau,
  construireInstructions,
  construireInstructionsNiveau,
  niveauxGenerables,
  verifierCoherence,
  verifierCoherenceNiveau,
} from '../../src/content/generationVariantes.ts';
import { PROJECT_TYPES } from '../../src/domain/types.ts';
import type { NiveauParcours } from '../../src/domain/niveau.ts';
import libellesFr from '../../src/i18n/locales/fr/project.json' with { type: 'json' };

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dossierJours = join(racine, 'content', 'days');
const MODELE_PAR_DEFAUT = 'claude-sonnet-5-5';

function argument(nom: string): string | undefined {
  const index = process.argv.indexOf(`--${nom}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function abandonner(message: string): never {
  console.error(message);
  process.exit(1);
}

const jourBrut = argument('jour');
const type = argument('type');
const niveauBrut = argument('niveau');
const modele = argument('modele') ?? MODELE_PAR_DEFAUT;
const cle = process.env['ANTHROPIC_API_KEY'];

const USAGE = `Usage, au choix d'un seul axe :
  npm run variantes -- --jour <1-28> --type <${PROJECT_TYPES.join('|')}>
  npm run variantes -- --jour <1-28> --niveau <${niveauxGenerables().join('|')}>

La clé se passe par la variable d'environnement ANTHROPIC_API_KEY.`;

if (!jourBrut || (!type && !niveauBrut)) abandonner(USAGE);
// Les deux axes s'appliquent l'un après l'autre dans l'application, mais ils
// s'écrivent séparément : mélanger les deux demandes dans un seul appel
// produirait un JSON ambigu, et une variante mal rangée.
if (type && niveauBrut) {
  abandonner(`Un seul axe à la fois : « --type » ou « --niveau », pas les deux.\n\n${USAGE}`);
}

const jour = Number(jourBrut);
if (!Number.isInteger(jour) || jour < 1 || jour > 28) abandonner(`Jour invalide : ${jourBrut}.`);

if (type) {
  if (!PROJECT_TYPES.includes(type as (typeof PROJECT_TYPES)[number])) {
    abandonner(`Type inconnu : ${type}. Attendu : ${PROJECT_TYPES.join(', ')}.`);
  }
  if (type === 'autre') {
    abandonner("Le type « autre » n'a pas de variante : c'est le contenu générique.");
  }
}
if (niveauBrut && !niveauxGenerables().includes(niveauBrut as NiveauParcours)) {
  abandonner(
    `Niveau inconnu ou sans variante : ${niveauBrut}. Attendu : ${niveauxGenerables().join(', ')}.` +
      "\n« intermediaire » est le parcours standard : il n'a rien à remplacer.",
  );
}
if (!cle) abandonner("ANTHROPIC_API_KEY n'est pas définie : aucun appel ne sera fait.");

const chemin = (langue: 'fr' | 'ar') =>
  join(dossierJours, `day-${String(jour).padStart(2, '0')}.${langue}.json`);

async function lire(langue: 'fr' | 'ar'): Promise<Lesson> {
  const brut: unknown = JSON.parse(await readFile(chemin(langue), 'utf8'));
  const analyse = lessonSchema.safeParse(brut);
  if (!analyse.success)
    abandonner(`day-${String(jour).padStart(2, '0')}.${langue}.json est invalide.`);
  return analyse.data;
}

const [fr, ar] = await Promise.all([lire('fr'), lire('ar')]);

/** Clé du fichier JSON à compléter, et libellé affiché, selon l'axe demandé. */
const axe = niveauBrut
  ? { champ: 'variantesNiveau' as const, cle: niveauBrut, etiquette: `niveau ${niveauBrut}` }
  : { champ: 'variantes' as const, cle: type!, etiquette: `activité ${type!}` };

const activite = (libellesFr as { types: Record<string, string> }).types[type ?? ''] ?? type ?? '';

console.log(`Jour ${String(jour)} · ${fr.title}`);
console.log(`Axe : ${axe.etiquette} · modèle : ${modele}\n`);

const instructions = niveauBrut
  ? construireInstructionsNiveau(fr, ar, niveauBrut as NiveauParcours)
  : construireInstructions(fr, ar, type!, activite);

const reponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': cle,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: modele,
    max_tokens: 2000,
    messages: [{ role: 'user', content: instructions }],
  }),
});

if (!reponse.ok) {
  abandonner(`Appel refusé (${String(reponse.status)}) : ${(await reponse.text()).slice(0, 300)}`);
}

const charge = (await reponse.json()) as { content?: { type: string; text?: string }[] };
const texte = charge.content?.find((bloc) => bloc.type === 'text')?.text;
if (!texte) abandonner('Réponse vide.');

const variantes = niveauBrut
  ? analyserReponseNiveau(texte, niveauBrut as NiveauParcours)
  : analyserReponse(texte);
const fautes = niveauBrut
  ? verifierCoherenceNiveau(fr, niveauBrut as NiveauParcours, variantes)
  : verifierCoherence(fr, variantes);
if (fautes.length > 0) {
  abandonner(
    `La variante engendrée est incohérente, rien n'a été écrit :\n  - ${fautes.join('\n  - ')}`,
  );
}

for (const [langue, variante] of [
  ['fr', variantes.fr],
  ['ar', variantes.ar],
] as const) {
  const brut = JSON.parse(await readFile(chemin(langue), 'utf8')) as Record<string, unknown>;
  const existantes = (brut[axe.champ] ?? {}) as Record<string, unknown>;
  brut[axe.champ] = { ...existantes, [axe.cle]: { ...variante, brouillon: true } };
  await writeFile(chemin(langue), `${JSON.stringify(brut, null, 2)}\n`, 'utf8');
  console.log(`écrit : day-${String(jour).padStart(2, '0')}.${langue}.json`);
}

console.log(`
Variante « ${axe.cle} » écrite EN BROUILLON dans les deux langues.
Elle n'est pas affichée tant que « "brouillon": true » y figure.

À faire :
  1. relire les deux fichiers, corriger ce qui sonne faux ;
  2. retirer la ligne "brouillon": true dans les DEUX langues ;
  3. npx prettier --write 'content/days/day-*.json'
  4. npm run validate:content && npm run test`);
