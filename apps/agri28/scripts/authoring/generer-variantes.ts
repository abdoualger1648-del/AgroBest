/**
 * Écriture assistée des variantes par type d'activité (phase 10).
 *
 *   ANTHROPIC_API_KEY=… npm run variantes -- --jour 7 --type apiculture
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
  construireInstructions,
  verifierCoherence,
} from '../../src/content/generationVariantes.ts';
import { PROJECT_TYPES } from '../../src/domain/types.ts';
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
const modele = argument('modele') ?? MODELE_PAR_DEFAUT;
const cle = process.env['ANTHROPIC_API_KEY'];

if (!jourBrut || !type) {
  abandonner(
    'Usage : npm run variantes -- --jour <1-28> --type <' +
      PROJECT_TYPES.join('|') +
      '>\n' +
      "La clé se passe par la variable d'environnement ANTHROPIC_API_KEY.",
  );
}
const jour = Number(jourBrut);
if (!Number.isInteger(jour) || jour < 1 || jour > 28) abandonner(`Jour invalide : ${jourBrut}.`);
if (!PROJECT_TYPES.includes(type as (typeof PROJECT_TYPES)[number])) {
  abandonner(`Type inconnu : ${type}. Attendu : ${PROJECT_TYPES.join(', ')}.`);
}
if (type === 'autre')
  abandonner("Le type « autre » n'a pas de variante : c'est le contenu générique.");
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
const activite = (libellesFr as { types: Record<string, string> }).types[type] ?? type;

console.log(`Jour ${String(jour)} · ${fr.title}`);
console.log(`Activité : ${activite} · modèle : ${modele}\n`);

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
    messages: [{ role: 'user', content: construireInstructions(fr, ar, type, activite) }],
  }),
});

if (!reponse.ok) {
  abandonner(`Appel refusé (${String(reponse.status)}) : ${(await reponse.text()).slice(0, 300)}`);
}

const charge = (await reponse.json()) as { content?: { type: string; text?: string }[] };
const texte = charge.content?.find((bloc) => bloc.type === 'text')?.text;
if (!texte) abandonner('Réponse vide.');

const variantes = analyserReponse(texte);
const fautes = verifierCoherence(fr, variantes);
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
  const existantes = (brut['variantes'] ?? {}) as Record<string, unknown>;
  brut['variantes'] = { ...existantes, [type]: { ...variante, brouillon: true } };
  await writeFile(chemin(langue), `${JSON.stringify(brut, null, 2)}\n`, 'utf8');
  console.log(`écrit : day-${String(jour).padStart(2, '0')}.${langue}.json`);
}

console.log(`
Variante « ${type} » écrite EN BROUILLON dans les deux langues.
Elle n'est pas affichée tant que « "brouillon": true » y figure.

À faire :
  1. relire les deux fichiers, corriger ce qui sonne faux ;
  2. retirer la ligne "brouillon": true dans les DEUX langues ;
  3. npm run validate:content && npm run test`);
