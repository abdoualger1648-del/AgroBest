// Extension explicite : ce module est aussi exécuté directement par Node
// (`node --experimental-strip-types`), qui ne devine pas les extensions,
// contrairement à Vite. Même raison que dans `validate-content.ts`.
import {
  varianteNiveauSchema,
  varianteSchema,
  type Lesson,
  type Variante,
  type VarianteNiveau,
} from './schema.ts';
import { NIVEAUX_PARCOURS, type NiveauParcours } from '../domain/niveau.ts';

/**
 * Cœur de l'écriture assistée des variantes (phase 10).
 *
 * Séparé de l'appel réseau pour une raison simple : la construction des
 * instructions et l'analyse de la réponse sont ce qui peut mal tourner, et
 * ce sont les seules parties qu'on peut éprouver sans dépenser un centime.
 *
 * Ce module n'est utilisé que par `scripts/authoring/generer-variantes.ts` :
 * il ne part pas dans l'application.
 */

export interface VariantesBilingues {
  fr: Variante;
  ar: Variante;
}

/** Les identifiants qu'une variante a le droit de viser, pour un jour donné. */
export function cibles(lecon: Lesson): { captures: string[]; prompts: string[] } {
  return {
    captures: lecon.sections.practice.steps.flatMap((e) => (e.capture ? [e.capture.id] : [])),
    prompts: lecon.sections.practice.steps.flatMap((e) => (e.prompt ? [e.prompt.id] : [])),
  };
}

function exemple(lecon: Lesson): string {
  const bloc = lecon.sections.concept.body.find((b) => b.type === 'example');
  return bloc && 'text' in bloc ? bloc.text : '';
}

function libelles(lecon: Lesson): string {
  return lecon.sections.practice.steps
    .flatMap((e) => (e.capture ? [`  ${e.capture.id} : ${e.capture.label}`] : []))
    .join('\n');
}

/**
 * Instructions envoyées au modèle. Les deux langues sont demandées **dans le
 * même appel** : c'est ce qui garantit la parité AR/FR par construction,
 * comme le générateur de jours (`emit.py`).
 */
export function construireInstructions(
  leconFr: Lesson,
  leconAr: Lesson,
  type: string,
  activite: string,
): string {
  const { captures, prompts } = cibles(leconFr);
  return `Tu adaptes une leçon d'un parcours agricole algérien à un type d'activité précis.

ACTIVITÉ VISÉE : ${activite} (identifiant « ${type} »)

LEÇON : jour ${String(leconFr.day)} — « ${leconFr.title} »
Idée de la journée : ${leconFr.subtitle}

Exemple de terrain actuel (français) :
${exemple(leconFr)}

Exemple de terrain actuel (arabe) :
${exemple(leconAr)}

Libellés de capture actuels (français) :
${libelles(leconFr)}

Libellés de capture actuels (arabe) :
${libelles(leconAr)}

CE QUE TU PRODUIS — un objet JSON, et rien d'autre :
{
  "fr": { "terrain": { "label": "...", "text": "..." }, "captures": { "<id>": "..." }, "indices": { "<id>": "..." } },
  "ar": { "terrain": { "label": "...", "text": "..." }, "captures": { "<id>": "..." }, "indices": { "<id>": "..." } }
}

RÈGLES, toutes impératives :
- Identifiants de capture autorisés : ${captures.join(', ') || '(aucun)'}.
- Identifiants de prompt autorisés : ${prompts.join(', ') || '(aucun)'}.
  N'invente aucun identifiant. Omets ceux que tu ne changes pas.
- « terrain » raconte la MÊME situation que l'exemple actuel, transposée à
  l'activité : même longueur, même structure, même morale. Change le prénom,
  la wilaya, les unités et les gestes du métier.
- N'écris AUCUN prix, AUCUNE dose, AUCUN rendement chiffré, AUCUN numéro de
  décret ni de loi. Aucun chiffre en dinars. Les quantités ne servent qu'à
  dimensionner l'exploitation (« 40 ruches », « 2 hectares »).
- Le français vouvoie, en phrases courtes, sans anglicisme.
- L'arabe est standard simple, avec les mots réellement employés en Algérie,
  sans dialecte écrit. Les deux langues disent la MÊME chose.
- Les deux objets "fr" et "ar" portent exactement les mêmes clés.

Réponds par le JSON seul, sans texte autour, sans bloc de code.`;
}

/** Erreur d'analyse, avec un message qui dit quoi corriger. */
export class ReponseInvalide extends Error {}

/**
 * Lit la réponse du modèle. Tolère un bloc de code autour du JSON, refuse
 * tout le reste : une variante mal formée ne doit jamais atteindre un fichier
 * de contenu.
 */
export function analyserReponse(texte: string): VariantesBilingues {
  const nettoye = texte
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  let brut: unknown;
  try {
    brut = JSON.parse(nettoye);
  } catch {
    throw new ReponseInvalide("la réponse n'est pas du JSON.");
  }
  if (typeof brut !== 'object' || brut === null || !('fr' in brut) || !('ar' in brut)) {
    throw new ReponseInvalide('la réponse doit porter les deux clés « fr » et « ar ».');
  }

  const { fr, ar } = brut;
  const analyseFr = varianteSchema.safeParse(fr);
  const analyseAr = varianteSchema.safeParse(ar);
  if (!analyseFr.success)
    throw new ReponseInvalide(`variante française : ${analyseFr.error.issues[0]?.message ?? '?'}`);
  if (!analyseAr.success)
    throw new ReponseInvalide(`variante arabe : ${analyseAr.error.issues[0]?.message ?? '?'}`);

  return { fr: analyseFr.data, ar: analyseAr.data };
}

/**
 * Vérifie que la variante ne vise que des identifiants réels et que les deux
 * langues portent les mêmes clés. C'est la même exigence que le validateur de
 * contenu, appliquée AVANT d'écrire dans les fichiers.
 */
export function verifierCoherence(lecon: Lesson, variantes: VariantesBilingues): string[] {
  const { captures, prompts } = cibles(lecon);
  const fautes: string[] = [];

  const signature = (v: Variante) =>
    [
      v.terrain ? 'terrain' : null,
      ...Object.keys(v.captures ?? {}).map((id) => `capture:${id}`),
      ...Object.keys(v.indices ?? {}).map((id) => `indice:${id}`),
    ]
      .filter((x): x is string => x !== null)
      .sort()
      .join(',');

  if (signature(variantes.fr) !== signature(variantes.ar)) {
    fautes.push(
      `les deux langues ne couvrent pas les mêmes champs : « ${signature(variantes.fr)} » contre « ${signature(variantes.ar)} ».`,
    );
  }

  // Les deux langues sont connues : on les parcourt nommément plutôt que par
  // `Object.entries`, qui perd le typage.
  for (const langue of ['fr', 'ar'] as const) {
    const variante = variantes[langue];
    for (const id of Object.keys(variante.captures ?? {})) {
      if (!captures.includes(id)) fautes.push(`${langue} : capture inconnue « ${id} ».`);
    }
    for (const id of Object.keys(variante.indices ?? {})) {
      if (!prompts.includes(id)) fautes.push(`${langue} : prompt inconnu « ${id} ».`);
    }
  }

  return fautes;
}

// ——— variantes par niveau (phase 12) ———

export interface VariantesNiveauBilingues {
  fr: VarianteNiveau;
  ar: VarianteNiveau;
}

/** Niveaux pour lesquels une variante a un sens : « intermediaire » est le standard. */
export function niveauxGenerables(): NiveauParcours[] {
  return NIVEAUX_PARCOURS.filter((niveau) => niveau !== 'intermediaire');
}

function etapes(lecon: Lesson): string {
  return lecon.sections.practice.steps
    .map((etape, index) => `  ${String(index + 1)}. ${etape.instruction}`)
    .join('\n');
}

/**
 * Instructions pour une variante de NIVEAU. Les deux langues sont demandées
 * dans le même appel, comme pour les variantes de métier : c'est ce qui
 * garantit la parité AR/FR par construction.
 *
 * Le champ attendu dépend du niveau, et c'est volontaire : on n'écrit pas
 * « une aide ou un défi, à ton choix », on demande exactement l'un des deux.
 */
export function construireInstructionsNiveau(
  leconFr: Lesson,
  leconAr: Lesson,
  niveau: NiveauParcours,
): string {
  const { prompts } = cibles(leconFr);
  const debutant = niveau === 'debutant';
  const champ = debutant ? 'aide' : 'defi';

  const consigne = debutant
    ? `« aide » est un paragraphe de 3 à 5 phrases, placé AVANT les étapes, pour
quelqu'un qui n'a jamais utilisé d'outil d'IA. Il explique les GESTES :
où appuyer, comment copier, comment coller, quoi faire si rien ne se passe.
Il n'explique jamais le métier d'agriculteur, et n'ajoute aucune étape.`
    : `« defi » est un paragraphe de 2 à 4 phrases, placé APRÈS les étapes, pour
quelqu'un qui manie déjà ces outils. Il demande un approfondissement réel —
une contre-épreuve, une comparaison, une vérification plus poussée — et non
« recommencez en mieux ». Il suppose les étapes déjà faites.`;

  return `Tu adaptes une leçon d'un parcours agricole algérien au NIVEAU de l'utilisateur.

NIVEAU VISÉ : ${niveau}

LEÇON : jour ${String(leconFr.day)} — « ${leconFr.title} »
Idée de la journée : ${leconFr.subtitle}

Étapes de la pratique (français) :
${etapes(leconFr)}

Étapes de la pratique (arabe) :
${etapes(leconAr)}

CE QUE TU PRODUIS — un objet JSON, et rien d'autre :
{
  "fr": { "${champ}": "..." },
  "ar": { "${champ}": "..." }
}

RÈGLES, toutes impératives :
- Tu produis le champ « ${champ} », et lui seul. Aucun autre champ.
- ${consigne}
- Tu peux en plus fournir « indices » pour reformuler l'indice d'un prompt.
  Identifiants de prompt autorisés : ${prompts.join(', ') || '(aucun)'}.
  N'invente aucun identifiant. Omets « indices » si tu ne le changes pas.
- Tu ne réécris JAMAIS le texte d'un prompt : il porte les garde-fous du
  parcours. Tu n'y as pas accès, et c'est voulu.
- N'écris AUCUN prix, AUCUNE dose, AUCUN rendement chiffré, AUCUN numéro de
  décret ni de loi. Aucun chiffre en dinars.
- Le français vouvoie, en phrases courtes, sans anglicisme non expliqué.
- L'arabe est standard simple, avec les mots réellement employés en Algérie,
  sans dialecte écrit. Les chiffres s'écrivent en chiffres occidentaux.
- Les deux langues disent la MÊME chose et portent exactement les mêmes clés.

Réponds par le JSON seul, sans texte autour, sans bloc de code.`;
}

/** Lit la réponse du modèle pour une variante de niveau. */
export function analyserReponseNiveau(
  texte: string,
  niveau: NiveauParcours,
): VariantesNiveauBilingues {
  const nettoye = texte
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  let brut: unknown;
  try {
    brut = JSON.parse(nettoye);
  } catch {
    throw new ReponseInvalide("la réponse n'est pas du JSON.");
  }
  if (typeof brut !== 'object' || brut === null || !('fr' in brut) || !('ar' in brut)) {
    throw new ReponseInvalide('la réponse doit porter les deux clés « fr » et « ar ».');
  }

  const { fr, ar } = brut;
  const analyseFr = varianteNiveauSchema.safeParse(fr);
  const analyseAr = varianteNiveauSchema.safeParse(ar);
  if (!analyseFr.success)
    throw new ReponseInvalide(`variante française : ${analyseFr.error.issues[0]?.message ?? '?'}`);
  if (!analyseAr.success)
    throw new ReponseInvalide(`variante arabe : ${analyseAr.error.issues[0]?.message ?? '?'}`);

  // Le champ attendu dépend du niveau : une « aide » livrée pour un avancé
  // serait affichée au mauvais endroit de l'écran.
  const attendu = niveau === 'debutant' ? 'aide' : 'defi';
  for (const [langue, variante] of [
    ['fr', analyseFr.data],
    ['ar', analyseAr.data],
  ] as const) {
    if (!(attendu in variante)) {
      throw new ReponseInvalide(`${langue} : le champ « ${attendu} » manque pour « ${niveau} ».`);
    }
  }

  return { fr: analyseFr.data, ar: analyseAr.data };
}

/**
 * Vérifie qu'une variante de niveau ne vise que des prompts réels, que les
 * deux langues portent les mêmes champs, et qu'elle ne remplit pas le champ
 * de l'autre niveau.
 */
export function verifierCoherenceNiveau(
  lecon: Lesson,
  niveau: NiveauParcours,
  variantes: VariantesNiveauBilingues,
): string[] {
  const { prompts } = cibles(lecon);
  const fautes: string[] = [];

  if (niveau === 'intermediaire') {
    fautes.push("« intermediaire » est le parcours standard : il n'a aucune variante à recevoir.");
  }

  const signature = (v: VarianteNiveau) =>
    [
      v.aide ? 'aide' : null,
      v.defi ? 'defi' : null,
      ...Object.keys(v.indices ?? {}).map((id) => `indice:${id}`),
    ]
      .filter((champ): champ is string => champ !== null)
      .sort()
      .join(',');

  if (signature(variantes.fr) !== signature(variantes.ar)) {
    fautes.push(
      `les deux langues ne couvrent pas les mêmes champs : « ${signature(variantes.fr)} » contre « ${signature(variantes.ar)} ».`,
    );
  }

  for (const langue of ['fr', 'ar'] as const) {
    const variante = variantes[langue];
    if (niveau === 'debutant' && variante.defi) {
      fautes.push(`${langue} : un « defi » pour un débutant — champ réservé au niveau avancé.`);
    }
    if (niveau === 'avance' && variante.aide) {
      fautes.push(`${langue} : une « aide » pour un avancé — champ réservé au niveau débutant.`);
    }
    for (const id of Object.keys(variante.indices ?? {})) {
      if (!prompts.includes(id)) fautes.push(`${langue} : prompt inconnu « ${id} ».`);
    }
  }

  return fautes;
}
