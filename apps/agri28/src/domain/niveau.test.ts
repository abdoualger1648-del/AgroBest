import { describe, expect, it } from 'vitest';
import {
  AXES_NIVEAU,
  NIVEAUX_PARCOURS,
  SEUIL_AVANCE,
  SEUIL_CONTEXTE,
  SEUIL_INTERMEDIAIRE,
  contexteDepuis,
  estComplet,
  estNiveauParcours,
  evaluer,
  niveauDepuis,
  questionsSansReponse,
  rangNiveau,
  scorer,
  type QuestionNotee,
} from './niveau';

/** Trois questions inventées, une par axe, barème volontairement simple. */
const questions: QuestionNotee[] = [
  {
    id: 'q_ia',
    axe: 'ia',
    options: [
      { id: 'rien', points: 0 },
      { id: 'moyen', points: 2 },
      { id: 'beaucoup', points: 4 },
    ],
  },
  {
    id: 'q_mat',
    axe: 'maturite',
    options: [
      { id: 'idee', points: 0 },
      { id: 'produit', points: 2 },
    ],
  },
  {
    id: 'q_ges',
    axe: 'gestion',
    options: [
      { id: 'rien', points: 0 },
      { id: 'cahier', points: 2 },
    ],
  },
];

describe('scorer', () => {
  it('rend un pourcentage par axe', () => {
    const scores = scorer(questions, { q_ia: 'moyen', q_mat: 'produit', q_ges: 'rien' });
    expect(scores).toEqual({ ia: 50, maturite: 100, gestion: 0 });
  });

  it('compte une question sans réponse comme un zéro, sans la retirer du dénominateur', () => {
    // Sinon un test à moitié rempli afficherait un score flatteur.
    expect(scorer(questions, {}).ia).toBe(0);
    expect(scorer(questions, { q_ia: 'beaucoup' }).ia).toBe(100);
  });

  it('ignore une réponse qui ne correspond à aucune option', () => {
    expect(scorer(questions, { q_ia: 'inventé' }).ia).toBe(0);
  });

  it('rend zéro pour un axe sans question, sans diviser par zéro', () => {
    const scores = scorer([questions[0]!], {});
    expect(scores.maturite).toBe(0);
    expect(scores.gestion).toBe(0);
    expect(Number.isNaN(scores.maturite)).toBe(false);
  });
});

describe('niveauDepuis', () => {
  it('reste débutant sous le seuil intermédiaire', () => {
    expect(niveauDepuis({ ia: SEUIL_INTERMEDIAIRE - 1, maturite: 0, gestion: 0 })).toBe('debutant');
  });

  it('passe intermédiaire au seuil exact', () => {
    expect(niveauDepuis({ ia: SEUIL_INTERMEDIAIRE, maturite: 0, gestion: 0 })).toBe(
      'intermediaire',
    );
  });

  it('passe avancé au seuil exact', () => {
    expect(niveauDepuis({ ia: SEUIL_AVANCE, maturite: 0, gestion: 0 })).toBe('avance');
  });

  it("l'aisance avec l'IA fixe un plafond : une exploitation établie sans IA reste débutante", () => {
    // C'est la décision D88, et le cas qui la justifie : le niveau décide si
    // l'utilisateur reçoit le prompt tout écrit. Un éleveur chevronné qui n'a
    // jamais ouvert un assistant a besoin du pas-à-pas, quelle que soit la
    // tenue de ses comptes.
    expect(niveauDepuis({ ia: 0, maturite: 100, gestion: 100 })).toBe('debutant');
    expect(niveauDepuis({ ia: SEUIL_INTERMEDIAIRE - 1, maturite: 100, gestion: 100 })).toBe(
      'debutant',
    );
  });

  it('accorde un cran quand le contexte est solide et la base au moins intermédiaire', () => {
    const scores = { ia: SEUIL_INTERMEDIAIRE, maturite: 100, gestion: 100 };
    expect(contexteDepuis(scores)).toBeGreaterThanOrEqual(SEUIL_CONTEXTE);
    expect(niveauDepuis(scores)).toBe('avance');
  });

  it("n'accorde pas de cran sous le seuil de contexte", () => {
    const scores = { ia: SEUIL_INTERMEDIAIRE, maturite: 0, gestion: 0 };
    expect(contexteDepuis(scores)).toBeLessThan(SEUIL_CONTEXTE);
    expect(niveauDepuis(scores)).toBe('intermediaire');
  });

  it('ne dépasse jamais le dernier niveau', () => {
    expect(niveauDepuis({ ia: 100, maturite: 100, gestion: 100 })).toBe('avance');
    expect(rangNiveau('avance')).toBe(NIVEAUX_PARCOURS.length - 1);
  });
});

describe('evaluer', () => {
  it('réunit les scores, le contexte et le niveau', () => {
    const resultat = evaluer(questions, { q_ia: 'beaucoup', q_mat: 'produit', q_ges: 'cahier' });
    expect(resultat.scores).toEqual({ ia: 100, maturite: 100, gestion: 100 });
    expect(resultat.contexte).toBe(100);
    expect(resultat.niveau).toBe('avance');
  });
});

describe('complétude', () => {
  it('liste les questions sans réponse dans l’ordre du test', () => {
    expect(questionsSansReponse(questions, { q_mat: 'idee' })).toEqual(['q_ia', 'q_ges']);
  });

  it('refuse un test incomplet', () => {
    expect(estComplet(questions, { q_ia: 'moyen' })).toBe(false);
    expect(estComplet(questions, { q_ia: 'moyen', q_mat: 'idee', q_ges: 'rien' })).toBe(true);
  });

  it('refuse un test sans aucune question', () => {
    expect(estComplet([], {})).toBe(false);
  });
});

describe('garde-fous de type', () => {
  it('reconnaît les trois niveaux et rejette le reste', () => {
    for (const niveau of NIVEAUX_PARCOURS) expect(estNiveauParcours(niveau)).toBe(true);
    expect(estNiveauParcours('expert')).toBe(false);
    expect(estNiveauParcours(null)).toBe(false);
    expect(estNiveauParcours(2)).toBe(false);
  });

  it('porte exactement trois axes', () => {
    expect([...AXES_NIVEAU]).toEqual(['ia', 'maturite', 'gestion']);
  });
});
