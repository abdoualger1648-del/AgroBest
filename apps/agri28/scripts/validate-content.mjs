/**
 * Validation du contenu (phase 1).
 *
 * À ce stade, seuls les garde-fous existent. Le schéma complet des leçons
 * (Zod, parité AR/FR, prix sans source datée) arrive avec la phase 3 ;
 * ce script grandira avec le contenu.
 *
 *   npm run validate:content
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const contentDir = resolve(dirname(fileURLToPath(import.meta.url)), '../content');
const LANGS = ['fr', 'ar'];
const SEVERITIES = ['info', 'warning', 'danger'];

/** @type {string[]} */
const errors = [];
const fail = (message) => errors.push(message);

async function readJson(relativePath) {
  const raw = await readFile(join(contentDir, relativePath), 'utf8');
  return JSON.parse(raw);
}

async function validateGuardrails() {
  const data = await readJson('guardrails.json');

  if (data.schema !== 1) fail(`guardrails.json : schema attendu 1, reçu ${String(data.schema)}`);
  if (!Array.isArray(data.guardrails) || data.guardrails.length === 0) {
    fail('guardrails.json : la liste « guardrails » est vide ou absente');
    return 0;
  }

  const seen = new Set();
  for (const item of data.guardrails) {
    const id = item?.id;
    if (typeof id !== 'string' || !/^[a-z0-9_]+$/.test(id)) {
      fail(`guardrails.json : identifiant invalide (${JSON.stringify(id)})`);
      continue;
    }
    if (seen.has(id)) fail(`guardrails.json : identifiant en double « ${id} »`);
    seen.add(id);

    if (!SEVERITIES.includes(item.severity)) {
      fail(`guardrails.json : « ${id} » a une gravité inconnue « ${String(item.severity)} »`);
    }
    for (const lang of LANGS) {
      const text = item?.text?.[lang];
      if (typeof text !== 'string' || text.trim().length < 20) {
        fail(`guardrails.json : « ${id} » n'a pas de texte utilisable en ${lang}`);
      }
    }
    const fr = item?.text?.fr;
    const ar = item?.text?.ar;
    if (typeof ar === 'string' && !/[؀-ۿ]/.test(ar)) {
      fail(`guardrails.json : « ${id} » — le texte arabe ne contient aucun caractère arabe`);
    }
    if (typeof fr === 'string' && typeof ar === 'string' && fr === ar) {
      fail(`guardrails.json : « ${id} » — le texte arabe est identique au français`);
    }
  }
  return data.guardrails.length;
}

async function countLessons() {
  try {
    const files = await readdir(join(contentDir, 'days'));
    return files.filter((name) => /^day-\d{2}\.(fr|ar)\.json$/.test(name)).length;
  } catch {
    return 0;
  }
}

const guardrailCount = await validateGuardrails();
const lessonCount = await countLessons();

if (errors.length > 0) {
  console.error('Contenu invalide :');
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

console.log(`Contenu valide : ${guardrailCount} garde-fous, ${lessonCount} fichiers de leçon.`);
if (lessonCount === 0) {
  console.log('Aucune leçon pour l’instant — elles arrivent avec la phase 3.');
}
