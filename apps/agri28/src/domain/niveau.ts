/**
 * Niveau de parcours (phase 12).
 *
 * Un test passé une fois, avant le premier dossier, situe l'utilisateur sur
 * trois axes et en déduit un niveau. Le niveau ne change ni le nombre de
 * jours ni leur ordre : il change la PROFONDEUR de chaque journée (une aide
 * pas-à-pas en plus, ou au contraire un défi et un prompt à compléter).
 *
 * Module **pur** : ni DOM, ni base, ni contenu. Il reçoit la forme minimale
 * des questions, pas le fichier de contenu bilingue — ce qui permet de
 * l'éprouver avec trois questions inventées.
 *
 * Attention au vocabulaire : `Niveau` (src/domain/access.ts) désigne le
 * NIVEAU DE COMPTE, c'est-à-dire le nombre de dossiers autorisés (D76). Les
 * deux notions sont sans rapport et ne doivent jamais être confondues.
 */

export const NIVEAUX_PARCOURS = ['debutant', 'intermediaire', 'avance'] as const;
export type NiveauParcours = (typeof NIVEAUX_PARCOURS)[number];

/**
 * Les trois axes mesurés.
 *
 * - `ia` : aisance avec les outils d'IA et le téléphone.
 * - `maturite` : où en est le projet (une idée, un lancement, une production).
 * - `gestion` : ce qui est déjà suivi (dépenses, chiffres de production).
 */
export const AXES_NIVEAU = ['ia', 'maturite', 'gestion'] as const;
export type AxeNiveau = (typeof AXES_NIVEAU)[number];

/** Score par axe, en pourcentage du maximum atteignable sur cet axe. */
export type ScoresNiveau = Record<AxeNiveau, number>;

/** En dessous de ce score d'aisance IA, le parcours reste pas-à-pas. */
export const SEUIL_INTERMEDIAIRE = 30;
/** Au-dessus de ce score d'aisance IA, le parcours passe en version courte. */
export const SEUIL_AVANCE = 70;
/** Contexte (projet + gestion) à partir duquel un cran est accordé. */
export const SEUIL_CONTEXTE = 60;

/**
 * Forme minimale d'une question, telle que le calcul en a besoin. Le fichier
 * de contenu la satisfait structurellement, avec ses libellés bilingues en
 * plus — le domaine n'a pas à les connaître.
 */
export interface QuestionNotee {
  readonly id: string;
  readonly axe: AxeNiveau;
  readonly options: readonly { readonly id: string; readonly points: number }[];
}

/** Réponses de l'utilisateur : identifiant de question → identifiant d'option. */
export type ReponsesNiveau = Readonly<Record<string, string>>;

export interface EvaluationNiveau {
  scores: ScoresNiveau;
  /** Score des deux axes de contexte réunis, celui qui accorde le cran. */
  contexte: number;
  niveau: NiveauParcours;
}

function pointsDe(question: QuestionNotee, reponses: ReponsesNiveau): number {
  const choisie = reponses[question.id];
  const option = question.options.find((candidate) => candidate.id === choisie);
  return option?.points ?? 0;
}

function maxDe(question: QuestionNotee): number {
  return question.options.reduce((plus, option) => Math.max(plus, option.points), 0);
}

/**
 * Score brut d'un ensemble de questions, en pourcentage arrondi.
 *
 * Une question sans réponse compte zéro **et reste au dénominateur** : un
 * test à moitié rempli ne doit pas afficher un score flatteur.
 */
function pourcentage(questions: readonly QuestionNotee[], reponses: ReponsesNiveau): number {
  const maximum = questions.reduce((somme, question) => somme + maxDe(question), 0);
  if (maximum === 0) return 0;
  const obtenu = questions.reduce((somme, question) => somme + pointsDe(question, reponses), 0);
  return Math.round((obtenu / maximum) * 100);
}

/** Score de chacun des trois axes, en pourcentage. */
export function scorer(
  questions: readonly QuestionNotee[],
  reponses: ReponsesNiveau,
): ScoresNiveau {
  return {
    ia: pourcentage(
      questions.filter((question) => question.axe === 'ia'),
      reponses,
    ),
    maturite: pourcentage(
      questions.filter((question) => question.axe === 'maturite'),
      reponses,
    ),
    gestion: pourcentage(
      questions.filter((question) => question.axe === 'gestion'),
      reponses,
    ),
  };
}

/** Rang du niveau, de 0 (débutant) à 2 (avancé). */
export function rangNiveau(niveau: NiveauParcours): number {
  return NIVEAUX_PARCOURS.indexOf(niveau);
}

/**
 * Déduit le niveau des trois scores.
 *
 * Règle, et c'est une décision (D88) : **l'aisance avec l'IA fixe le niveau
 * de base**. Un projet déjà en production et un suivi déjà tenu peuvent le
 * relever d'un cran, jamais le faire monter depuis zéro. Car le niveau décide
 * si l'utilisateur reçoit le prompt tout écrit ou un prompt à compléter : un
 * éleveur chevronné qui n'a jamais ouvert ChatGPT a besoin du pas-à-pas,
 * quelle que soit la tenue de ses comptes.
 */
export function niveauDepuis(scores: ScoresNiveau): NiveauParcours {
  const base = scores.ia >= SEUIL_AVANCE ? 2 : scores.ia >= SEUIL_INTERMEDIAIRE ? 1 : 0;

  const contexte = contexteDepuis(scores);
  const cran = base >= 1 && contexte >= SEUIL_CONTEXTE ? 1 : 0;

  return NIVEAUX_PARCOURS[Math.min(NIVEAUX_PARCOURS.length - 1, base + cran)] ?? 'debutant';
}

/** Les deux axes de contexte réunis, à poids égal. */
export function contexteDepuis(scores: ScoresNiveau): number {
  return Math.round((scores.maturite + scores.gestion) / 2);
}

export function evaluer(
  questions: readonly QuestionNotee[],
  reponses: ReponsesNiveau,
): EvaluationNiveau {
  const scores = scorer(questions, reponses);
  return { scores, contexte: contexteDepuis(scores), niveau: niveauDepuis(scores) };
}

/** Questions encore sans réponse, dans l'ordre du test. */
export function questionsSansReponse(
  questions: readonly QuestionNotee[],
  reponses: ReponsesNiveau,
): string[] {
  return questions
    .filter((question) => {
      const choisie = reponses[question.id];
      return choisie === undefined || !question.options.some((option) => option.id === choisie);
    })
    .map((question) => question.id);
}

/** Le test ne peut être validé que complet : aucun niveau deviné. */
export function estComplet(questions: readonly QuestionNotee[], reponses: ReponsesNiveau): boolean {
  return questions.length > 0 && questionsSansReponse(questions, reponses).length === 0;
}

export function estNiveauParcours(valeur: unknown): valeur is NiveauParcours {
  return typeof valeur === 'string' && (NIVEAUX_PARCOURS as readonly string[]).includes(valeur);
}
