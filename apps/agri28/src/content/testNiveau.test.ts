import { describe, expect, it } from 'vitest';
import { questionsNiveau } from './testNiveau';
import { testNiveauFileSchema } from './schema';
import { AXES_NIVEAU, estComplet, evaluer, scorer } from '@/domain/niveau';

const questions = questionsNiveau();

describe('fichier du test de niveau', () => {
  it('se charge et porte au moins une question par axe', () => {
    expect(questions.length).toBeGreaterThanOrEqual(3);
    for (const axe of AXES_NIVEAU) {
      expect(questions.some((question) => question.axe === axe)).toBe(true);
    }
  });

  it('écrit les deux langues pour chaque question et chaque option', () => {
    for (const question of questions) {
      expect(question.text.fr.length).toBeGreaterThan(0);
      expect(question.text.ar).toMatch(/[؀-ۿ]/);
      for (const option of question.options) {
        expect(option.label.fr.length).toBeGreaterThan(0);
        expect(option.label.ar).toMatch(/[؀-ۿ]/);
      }
    }
  });

  it('utilise des chiffres occidentaux en arabe (D12, confirmée D44)', () => {
    const chiffresOrientaux = /[٠-٩]/;
    for (const question of questions) {
      expect(question.text.ar).not.toMatch(chiffresOrientaux);
      for (const option of question.options) {
        expect(option.label.ar).not.toMatch(chiffresOrientaux);
      }
    }
  });

  it('propose une option à zéro point et une au maximum sur chaque question', () => {
    for (const question of questions) {
      const points = question.options.map((option) => option.points);
      expect(Math.min(...points)).toBe(0);
      expect(Math.max(...points)).toBeGreaterThan(0);
    }
  });
});

describe('barème du vrai contenu', () => {
  /** Choisit sur chaque question l'option valant le moins / le plus de points. */
  function extreme(sens: 'min' | 'max'): Record<string, string> {
    const reponses: Record<string, string> = {};
    for (const question of questions) {
      const trie = [...question.options].sort((a, b) =>
        sens === 'min' ? a.points - b.points : b.points - a.points,
      );
      reponses[question.id] = trie[0]!.id;
    }
    return reponses;
  }

  it('les trois niveaux sont atteignables avec le barème réel', () => {
    expect(evaluer(questions, extreme('min')).niveau).toBe('debutant');
    expect(evaluer(questions, extreme('max')).niveau).toBe('avance');

    // Un profil médian : à l'aise avec le téléphone, un essai d'IA, projet
    // encore en préparation, rien de suivi.
    const median = {
      ia_usage: 'essai',
      ia_demande: 'courte',
      ia_copier: 'seul',
      ia_verif: 'parfois',
      projet_etat: 'lancement',
      projet_dossier: 'commence',
      gestion_argent: 'memoire',
      gestion_chiffres: 'approximatif',
    };
    expect(estComplet(questions, median)).toBe(true);
    expect(evaluer(questions, median).niveau).toBe('intermediaire');
  });

  it("une exploitation établie sans aucune pratique de l'IA reste débutante (D88)", () => {
    const reponses = {
      ia_usage: 'jamais',
      ia_demande: 'aucune',
      ia_copier: 'seul',
      ia_verif: 'ignore',
      projet_etat: 'etabli',
      projet_dossier: 'complet',
      gestion_argent: 'tableur',
      gestion_chiffres: 'date',
    };
    const resultat = evaluer(questions, reponses);
    expect(resultat.scores.maturite).toBe(100);
    expect(resultat.scores.gestion).toBe(100);
    expect(resultat.niveau).toBe('debutant');
  });

  it('le cran de contexte est réellement atteignable', () => {
    // Base intermédiaire, contexte solide : le cran doit s'appliquer.
    const reponses = {
      ia_usage: 'parfois',
      ia_demande: 'contexte',
      ia_copier: 'seul',
      ia_verif: 'ignore',
      projet_etat: 'etabli',
      projet_dossier: 'complet',
      gestion_argent: 'cahier',
      gestion_chiffres: 'date',
    };
    const resultat = evaluer(questions, reponses);
    expect(resultat.scores.ia).toBeLessThan(70);
    expect(resultat.niveau).toBe('avance');
  });

  it('un score ne dépasse jamais 100 % ni ne descend sous 0 %', () => {
    for (const reponses of [extreme('min'), extreme('max')]) {
      const scores = scorer(questions, reponses);
      for (const axe of AXES_NIVEAU) {
        expect(scores[axe]).toBeGreaterThanOrEqual(0);
        expect(scores[axe]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('schéma du test', () => {
  const base = {
    schema: 1 as const,
    questions: [
      {
        id: 'a',
        axe: 'ia' as const,
        text: { fr: 'x', ar: 'س' },
        options: [
          { id: 'o1', label: { fr: 'a', ar: 'أ' }, points: 0 },
          { id: 'o2', label: { fr: 'b', ar: 'ب' }, points: 2 },
        ],
      },
      {
        id: 'b',
        axe: 'maturite' as const,
        text: { fr: 'y', ar: 'ص' },
        options: [
          { id: 'o1', label: { fr: 'a', ar: 'أ' }, points: 0 },
          { id: 'o2', label: { fr: 'b', ar: 'ب' }, points: 1 },
        ],
      },
      {
        id: 'c',
        axe: 'gestion' as const,
        text: { fr: 'z', ar: 'ع' },
        options: [
          { id: 'o1', label: { fr: 'a', ar: 'أ' }, points: 0 },
          { id: 'o2', label: { fr: 'b', ar: 'ب' }, points: 1 },
        ],
      },
    ],
  };

  it('accepte un fichier minimal correct', () => {
    expect(testNiveauFileSchema.safeParse(base).success).toBe(true);
  });

  it('refuse un axe laissé sans aucune question', () => {
    const sansGestion = { ...base, questions: base.questions.slice(0, 2) };
    const resultat = testNiveauFileSchema.safeParse(sansGestion);
    expect(resultat.success).toBe(false);
    expect(JSON.stringify(resultat.error?.issues)).toContain('gestion');
  });

  it('refuse une question qui ne discrimine rien', () => {
    const plate = structuredClone(base);
    plate.questions[0]!.options[1]!.points = 0;
    const resultat = testNiveauFileSchema.safeParse(plate);
    expect(resultat.success).toBe(false);
    expect(JSON.stringify(resultat.error?.issues)).toContain('discrimine');
  });

  it('refuse deux questions de même identifiant', () => {
    const double = structuredClone(base);
    double.questions[1]!.id = 'a';
    expect(testNiveauFileSchema.safeParse(double).success).toBe(false);
  });

  it('refuse un champ inconnu (schéma strict)', () => {
    const sale = structuredClone(base) as unknown as Record<string, unknown>;
    sale['poids'] = 3;
    expect(testNiveauFileSchema.safeParse(sale).success).toBe(false);
  });
});
