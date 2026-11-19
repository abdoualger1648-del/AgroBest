/**
 * Validation du contenu pédagogique.
 *
 * Utilise exactement les mêmes schémas Zod que l'application
 * (src/content/schema.ts) : un contenu qui passe ici se chargera dans l'app.
 *
 *   npm run validate:content
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  guardrailsFileSchema,
  lessonSchema,
  templatesFileSchema,
  testNiveauFileSchema,
  toolsFileSchema,
  wilayasFileSchema,
  type Lesson,
} from '../src/content/schema.ts';
import { PROJECT_TYPES } from '../src/domain/types.ts';
import { NIVEAUX_PARCOURS } from '../src/domain/niveau.ts';

const contentDir = resolve(dirname(fileURLToPath(import.meta.url)), '../content');

const errors: string[] = [];
const warnings: string[] = [];
const fail = (message: string) => errors.push(message);
const warn = (message: string) => warnings.push(message);

/** Variables autorisées dans un template de prompt (docs/lesson-schema.md §2). */
const ALLOWED_VARIABLES = new Set([
  'project.name',
  'project.type',
  'project.scale',
  'project.area',
  'project.wilaya',
  'project.commune',
  'project.objective',
  'project.horizonMonths',
  'project.budgetCeiling',
  'project.waterSource',
  'project.startMonth',
  'today',
  'lang',
]);

/** Montants en dinars : une leçon qui en cite doit porter une source datée. */
const MONEY = /\d[\d\s.,\u00a0]*\s?(?:DA|DZD|دج|د\.ج)/u;

/** Références à un texte réglementaire précis (≠ simple mention d'une institution). */
const REGULATION =
  /\b(?:loi\s*n|décret|arrêté|journal\s+officiel|article\s+\d|قانون\s*رقم|مرسوم|الجريدة\s+الرسمية)/iu;

/**
 * Une phrase qui INTERDIT de citer un texte réglementaire ne l'affirme pas :
 * « ne cite aucun décret » ne demande évidemment pas de source.
 */
const NEGATION =
  /\b(?:aucun|aucune|ne\s+cite|n['’]invente|sans\s+citer|ne\s+mentionne|ne\s+donne)\b|لا\s+تذكر|لا\s+تخترع|دون\s+ذكر|بلا\s+ذكر/iu;

/** Phrases d'un texte (découpage grossier, suffisant pour lever une négation). */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?؟।\n])\s+/u);
}

/** Vrai si le texte AFFIRME une référence réglementaire, négations exclues. */
function assertsRegulation(text: string): boolean {
  return sentences(text).some((sentence) => REGULATION.test(sentence) && !NEGATION.test(sentence));
}

const HTML_TAG = /<\/?[a-z][\s\S]*?>/i;
const SHORTENERS = /(?:bit\.ly|tinyurl|t\.co|goo\.gl|lnkd\.in)/i;

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(join(contentDir, relativePath), 'utf8')) as unknown;
}

/** Toutes les chaînes de texte d'une leçon, pour les contrôles transversaux. */
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) allStrings(item, out);
  else if (value && typeof value === 'object')
    for (const item of Object.values(value)) allStrings(item, out);
  return out;
}

/**
 * Signature des variantes : les types couverts, et dans chacun les champs
 * remplacés. La parité AR/FR porte dessus comme sur le reste — une variante
 * écrite dans une seule langue laisserait un apiculteur arabophone devant le
 * texte générique sans qu'on s'en aperçoive.
 */
function signatureVariantes(lesson: Lesson): string[] {
  return Object.entries(lesson.variantes ?? {})
    .map(([type, variante]) => {
      const champs = [
        variante.terrain ? 'terrain' : null,
        ...Object.keys(variante.captures ?? {}).map((id) => `capture:${id}`),
        ...Object.keys(variante.indices ?? {}).map((id) => `indice:${id}`),
      ].filter((champ): champ is string => champ !== null);
      return `${type}=${champs.sort().join(',')}`;
    })
    .sort();
}

/**
 * Signature des variantes de NIVEAU : les niveaux couverts, et dans chacun
 * les champs remplacés. Soumise à la parité AR/FR comme le reste — une aide
 * écrite en français seulement serait un parcours à deux vitesses.
 */
function signatureVariantesNiveau(lesson: Lesson): string[] {
  return Object.entries(lesson.variantesNiveau ?? {})
    .map(([niveau, variante]) => {
      const champs = [
        variante.aide ? 'aide' : null,
        variante.defi ? 'defi' : null,
        ...Object.keys(variante.indices ?? {}).map((id) => `indice:${id}`),
      ]
        .filter((champ): champ is string => champ !== null)
        .sort();
      return `${niveau}(${champs.join(',')})`;
    })
    .sort();
}

function lessonIdentifiers(lesson: Lesson) {
  const { practice, quiz } = lesson.sections;
  return {
    variantes: signatureVariantes(lesson),
    variantesNiveau: signatureVariantesNiveau(lesson),
    steps: practice.steps.map((step) => step.id).sort(),
    prompts: practice.steps.flatMap((step) => (step.prompt ? [step.prompt.id] : [])).sort(),
    captures: practice.steps.flatMap((step) => (step.capture ? [step.capture.id] : [])).sort(),
    questions: quiz.questions.map((question) => question.id).sort(),
    choices: quiz.questions.map((question) => question.choices.map((c) => c.id).join('|')).sort(),
    tools: [...lesson.tools].sort(),
    guardrails: [...lesson.guardrails].sort(),
    dossierKind: lesson.produces?.dossierKind ?? null,
    requiresProject: lesson.requiresProject,
  };
}

const guardrailsRaw = await readJson('guardrails.json');
const guardrailsParsed = guardrailsFileSchema.safeParse(guardrailsRaw);
if (!guardrailsParsed.success) {
  fail(`guardrails.json : ${guardrailsParsed.error.issues.map((i) => i.message).join(' ; ')}`);
}
const guardrailIds = new Set(
  guardrailsParsed.success ? guardrailsParsed.data.guardrails.map((g) => g.id) : [],
);

const toolsRaw = await readJson('tools.json');
const toolsParsed = toolsFileSchema.safeParse(toolsRaw);
if (!toolsParsed.success) {
  fail(
    `tools.json : ${toolsParsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' ; ')}`,
  );
}
const tools = toolsParsed.success ? toolsParsed.data.tools : [];
const toolIds = new Set(tools.map((tool) => tool.id));

const wilayasRaw = await readJson('wilayas.json');
const wilayasParsed = wilayasFileSchema.safeParse(wilayasRaw);
if (!wilayasParsed.success) {
  fail(
    `wilayas.json : ${wilayasParsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' ; ')}`,
  );
} else if (wilayasParsed.data.count !== wilayasParsed.data.wilayas.length) {
  fail(
    `wilayas.json : count annoncé ${wilayasParsed.data.count}, ${wilayasParsed.data.wilayas.length} entrées réelles.`,
  );
}

const templatesRaw = await readJson(join('templates', 'templates.json'));
const templatesParsed = templatesFileSchema.safeParse(templatesRaw);
if (!templatesParsed.success) {
  for (const issue of templatesParsed.error.issues) {
    fail(`templates.json : ${issue.path.join('.')} — ${issue.message}`);
  }
} else {
  for (const template of templatesParsed.data.templates) {
    const texts = allStrings(template);
    const money = texts.find((text) => MONEY.test(text));
    if (money) {
      fail(
        `templates.json : le modèle « ${template.id} » contient un montant (${money.slice(0, 40)}…) ; les modèles doivent rester vierges.`,
      );
    }
    if (!/[\u0600-\u06ff]/.test(template.title.ar)) {
      fail(`templates.json : le modèle « ${template.id} » n'a pas de titre en arabe.`);
    }
  }
}

// ——— test de niveau (phase 12) ———
const testNiveauRaw = await readJson('test-niveau.json');
const testNiveauParsed = testNiveauFileSchema.safeParse(testNiveauRaw);
if (!testNiveauParsed.success) {
  for (const issue of testNiveauParsed.error.issues) {
    fail(`test-niveau.json : ${issue.path.join('.')} — ${issue.message}`);
  }
}
const questionsNiveau = testNiveauParsed.success ? testNiveauParsed.data.questions : [];
for (const question of questionsNiveau) {
  if (!/[\u0600-\u06ff]/.test(question.text.ar)) {
    fail(`test-niveau.json : la question « ${question.id} » n'est pas traduite en arabe.`);
  }
  for (const option of question.options) {
    if (!/[\u0600-\u06ff]/.test(option.label.ar)) {
      fail(
        `test-niveau.json : l'option « ${question.id}.${option.id} » n'est pas traduite en arabe.`,
      );
    }
  }
}

// ——— leçons ———
async function listLessonFiles(): Promise<string[]> {
  try {
    const files = await readdir(join(contentDir, 'days'));
    return files.filter((name) => /^day-\d{2}\.(fr|ar)\.json$/.test(name)).sort();
  } catch {
    return [];
  }
}

const lessonFiles = await listLessonFiles();

const lessons = new Map<string, Lesson>();

for (const file of lessonFiles) {
  const raw = await readJson(join('days', file));
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fail(`${file} : ${issue.path.join('.') || '(racine)'} — ${issue.message}`);
    }
    continue;
  }
  const lesson = parsed.data;

  const [, dayPart = '', langPart = ''] = /^day-(\d{2})\.(fr|ar)\.json$/.exec(file) ?? [];
  if (lesson.id !== `day-${dayPart}`) fail(`${file} : id « ${lesson.id} » ≠ nom du fichier.`);
  if (lesson.lang !== langPart) fail(`${file} : lang « ${lesson.lang} » ≠ suffixe du fichier.`);

  for (const toolId of lesson.tools) {
    if (!toolIds.has(toolId)) fail(`${file} : outil inconnu « ${toolId} » (absent de tools.json).`);
  }
  for (const guardrailId of lesson.guardrails) {
    if (!guardrailIds.has(guardrailId)) {
      fail(`${file} : garde-fou inconnu « ${guardrailId} » (absent de guardrails.json).`);
    }
  }

  for (const step of lesson.sections.practice.steps) {
    if (!step.prompt) continue;
    if (!toolIds.has(step.prompt.tool)) {
      fail(
        `${file} : le prompt « ${step.prompt.id} » cite un outil inconnu « ${step.prompt.tool} ».`,
      );
    }
    for (const match of step.prompt.template.matchAll(/\{\{([\w.]+)\}\}/g)) {
      const variable = match[1] ?? '';
      if (!ALLOWED_VARIABLES.has(variable)) {
        fail(
          `${file} : variable de prompt inconnue « {{${variable}}} » (prompt ${step.prompt.id}).`,
        );
      }
    }
  }

  // ——— variantes par type d'activité ———
  const captureIds = new Set(
    lesson.sections.practice.steps.flatMap((step) => (step.capture ? [step.capture.id] : [])),
  );
  const promptIds = new Set(
    lesson.sections.practice.steps.flatMap((step) => (step.prompt ? [step.prompt.id] : [])),
  );
  for (const [type, variante] of Object.entries(lesson.variantes ?? {})) {
    if (variante.brouillon === true) {
      warn(`${file} : variante « ${type} » en brouillon — à relire, elle n'est pas affichée.`);
    }
    if (!PROJECT_TYPES.includes(type as (typeof PROJECT_TYPES)[number])) {
      fail(`${file} : variante pour un type d'activité inconnu « ${type} ».`);
    }
    for (const id of Object.keys(variante.captures ?? {})) {
      if (!captureIds.has(id)) {
        fail(`${file} : variante « ${type} » vise une capture inexistante « ${id} ».`);
      }
    }
    for (const id of Object.keys(variante.indices ?? {})) {
      if (!promptIds.has(id)) {
        fail(`${file} : variante « ${type} » vise un prompt inexistant « ${id} ».`);
      }
    }
  }

  // ——— variantes par niveau (phase 12) ———
  for (const [niveau, variante] of Object.entries(lesson.variantesNiveau ?? {})) {
    if (variante.brouillon === true) {
      warn(
        `${file} : variante de niveau « ${niveau} » en brouillon — à relire, elle n'est pas affichée.`,
      );
    }
    if (!NIVEAUX_PARCOURS.includes(niveau as (typeof NIVEAUX_PARCOURS)[number])) {
      fail(`${file} : variante pour un niveau inconnu « ${niveau} ».`);
    }
    // « intermediaire » est le parcours standard : une variante pour lui ne
    // ferait que dupliquer le contenu de base, donc elle est refusée.
    if (niveau === 'intermediaire') {
      fail(
        `${file} : variante « intermediaire » inutile — ce niveau EST le parcours standard, il n'a rien à remplacer.`,
      );
    }
    if (!variante.aide && !variante.defi && !variante.indices) {
      fail(`${file} : variante de niveau « ${niveau} » vide — elle ne change rien.`);
    }
    for (const id of Object.keys(variante.indices ?? {})) {
      if (!promptIds.has(id)) {
        fail(`${file} : variante de niveau « ${niveau} » vise un prompt inexistant « ${id} ».`);
      }
    }
  }

  const texts = allStrings(lesson);
  const hasSources = (lesson.sources?.length ?? 0) > 0;
  const money = texts.find((text) => MONEY.test(text));
  if (money && !hasSources) {
    fail(
      `${file} : un montant est cité sans entrée « sources » datée → « ${money.slice(0, 70)}… ».`,
    );
  }
  const regulation = texts.find((text) => assertsRegulation(text));
  if (regulation && !hasSources) {
    fail(
      `${file} : un texte réglementaire est cité sans entrée « sources » datée → « ${regulation.slice(0, 70)}… ».`,
    );
  }
  const html = texts.find((text) => HTML_TAG.test(text));
  if (html) fail(`${file} : balise HTML interdite dans le contenu → « ${html.slice(0, 60)}… ».`);
  const insecure = texts.find((text) => /http:\/\//.test(text));
  if (insecure) fail(`${file} : lien non sécurisé (http://) → « ${insecure.slice(0, 60)}… ».`);
  const shortened = texts.find((text) => SHORTENERS.test(text));
  if (shortened) fail(`${file} : URL raccourcie interdite → « ${shortened.slice(0, 60)}… ».`);

  if (lesson.lang === 'ar' && !texts.some((text) => /[؀-ۿ]/.test(text))) {
    fail(`${file} : fichier annoncé en arabe sans aucun caractère arabe.`);
  }
  if (lesson.draft) warn(`${file} : marqué « draft » — à relire et valider avant publication.`);

  lessons.set(`${lesson.id}.${lesson.lang}`, lesson);
}

// ——— parité AR / FR ———
const dayIds = [...new Set([...lessons.values()].map((lesson) => lesson.id))].sort();
for (const dayId of dayIds) {
  const fr = lessons.get(`${dayId}.fr`);
  const ar = lessons.get(`${dayId}.ar`);
  if (!fr || !ar) {
    fail(
      `${dayId} : version ${fr ? 'arabe' : 'française'} manquante — les deux langues sont requises.`,
    );
    continue;
  }
  const left = lessonIdentifiers(fr);
  const right = lessonIdentifiers(ar);
  for (const key of Object.keys(left) as (keyof typeof left)[]) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      fail(
        `${dayId} : parité AR/FR rompue sur « ${key} » — FR ${JSON.stringify(left[key])} / AR ${JSON.stringify(right[key])}.`,
      );
    }
  }
}

// ——— avertissements sur les outils ———
const citedTools = new Set([...lessons.values()].flatMap((lesson) => lesson.tools));
const SIX_MONTHS = 182 * 24 * 60 * 60 * 1000;
for (const tool of tools) {
  if (!citedTools.has(tool.id)) continue;
  if (tool.availabilityDZ === 'a_verifier') {
    warn(
      `tools.json : disponibilité de « ${tool.name} » en Algérie NON confirmée (availabilityDZ = a_verifier).`,
    );
  }
  if (Date.now() - new Date(tool.checkedOn).getTime() > SIX_MONTHS) {
    warn(
      `tools.json : « ${tool.name} » vérifié le ${tool.checkedOn} — plus de 6 mois, à revérifier.`,
    );
  }
}

for (const warning of warnings) console.warn(`  ⚠ ${warning}`);

if (errors.length > 0) {
  console.error('\nContenu invalide :');
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

console.log(
  `\nContenu valide : ${guardrailIds.size} garde-fous, ${toolIds.size} outils, ` +
    `${questionsNiveau.length} questions de niveau, ` +
    `${templatesParsed.success ? templatesParsed.data.templates.length : 0} modèles, ` +
    `${wilayasParsed.success ? wilayasParsed.data.wilayas.length : 0} wilayas, ` +
    `${lessons.size} fichiers de leçon (${dayIds.length} jour(s), AR + FR).`,
);
