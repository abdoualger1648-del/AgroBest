import { beforeAll, describe, expect, it } from 'vitest';
import { loadLesson } from './loader';
import {
  appliquerNiveau,
  appliquerVariante,
  appliquerVariantes,
  niveauxAvecVariante,
  typesAvecVariante,
} from './variantes';
import type { Lesson } from './schema';

/**
 * Variantes par type d'activité. On part d'une leçon réelle plutôt que d'un
 * objet fabriqué : c'est la forme que la fonction rencontrera vraiment.
 */
let generique: Lesson;

beforeAll(async () => {
  generique = await loadLesson(1, 'fr');
});

function avecVariantes(): Lesson {
  const premiereCapture = generique.sections.practice.steps.find((e) => e.capture)?.capture?.id;
  const premierPrompt = generique.sections.practice.steps.find((e) => e.prompt)?.prompt?.id;
  return {
    ...generique,
    variantes: {
      apiculture: {
        terrain: { label: 'Du rucher', text: 'Yacine conduit 40 ruches à Médéa.' },
        ...(premiereCapture ? { captures: { [premiereCapture]: 'Combien de ruches ?' } } : {}),
        ...(premierPrompt ? { indices: { [premierPrompt]: 'Parlez de vos miellées.' } } : {}),
      },
    },
  };
}

describe('appliquerVariante', () => {
  it('rend la leçon inchangée sans variante, sans type, ou pour un type non couvert', () => {
    expect(appliquerVariante(generique, 'ovin')).toBe(generique);
    expect(appliquerVariante(avecVariantes(), null)).toEqual(avecVariantes());
    expect(appliquerVariante(avecVariantes(), 'ovin')).toEqual(avecVariantes());
  });

  it('remplace l’exemple de terrain, et lui seul parmi les blocs', () => {
    const avant = avecVariantes();
    const apres = appliquerVariante(avant, 'apiculture');

    const exemple = apres.sections.concept.body.find((bloc) => bloc.type === 'example');
    expect(exemple).toMatchObject({
      label: 'Du rucher',
      text: 'Yacine conduit 40 ruches à Médéa.',
    });

    // Les autres blocs sont identiques, dans le même ordre.
    const autresAvant = avant.sections.concept.body.filter((bloc) => bloc.type !== 'example');
    const autresApres = apres.sections.concept.body.filter((bloc) => bloc.type !== 'example');
    expect(autresApres).toEqual(autresAvant);
  });

  it('remplace le libellé de la capture visée, et l’indice du prompt visé', () => {
    const avant = avecVariantes();
    const apres = appliquerVariante(avant, 'apiculture');

    const capture = apres.sections.practice.steps.find((e) => e.capture)?.capture;
    expect(capture?.label).toBe('Combien de ruches ?');

    const prompt = apres.sections.practice.steps.find((e) => e.prompt)?.prompt;
    expect(prompt?.hint).toBe('Parlez de vos miellées.');
  });

  it('ne touche JAMAIS le gabarit d’un prompt', () => {
    // C'est lui qui porte les garde-fous : aucune variante ne doit pouvoir
    // le réécrire, et le schéma ne l'autorise même pas.
    const avant = avecVariantes();
    const apres = appliquerVariante(avant, 'apiculture');

    for (const [index, etape] of apres.sections.practice.steps.entries()) {
      expect(etape.prompt?.template).toBe(avant.sections.practice.steps[index]?.prompt?.template);
    }
  });

  it('laisse le quiz, les objectifs et les garde-fous intacts', () => {
    const avant = avecVariantes();
    const apres = appliquerVariante(avant, 'apiculture');

    expect(apres.sections.quiz).toEqual(avant.sections.quiz);
    expect(apres.objectives).toEqual(avant.objectives);
    expect(apres.guardrails).toEqual(avant.guardrails);
    expect(apres.sections.review).toEqual(avant.sections.review);
  });

  it('ne modifie pas la leçon d’origine', () => {
    const avant = avecVariantes();
    const copie = structuredClone(avant);
    appliquerVariante(avant, 'apiculture');
    expect(avant).toEqual(copie);
  });

  it('liste les types couverts', () => {
    // Le jour 1 réel couvre l'apiculture et le maraîchage.
    expect(typesAvecVariante(generique)).toEqual(['apiculture', 'maraichage']);
    expect(typesAvecVariante(avecVariantes())).toEqual(['apiculture']);
  });
});

describe('variante en brouillon', () => {
  it('n’est pas affichée tant qu’elle n’a pas été relue', () => {
    const brouillon: Lesson = {
      ...generique,
      variantes: {
        apiculture: {
          brouillon: true,
          terrain: { text: 'Texte engendré, pas encore relu.' },
        },
      },
    };

    // Le verrou est ici, pas dans un avertissement : du contenu écrit par
    // une IA ne peut pas atteindre un agriculteur avant relecture.
    expect(appliquerVariante(brouillon, 'apiculture')).toBe(brouillon);
    expect(typesAvecVariante(brouillon)).toEqual([]);
  });

  it('s’affiche dès que le drapeau est retiré', () => {
    const relue: Lesson = {
      ...generique,
      variantes: { apiculture: { terrain: { text: 'Texte relu.' } } },
    };
    const apres = appliquerVariante(relue, 'apiculture');
    expect(apres.sections.concept.body.find((b) => b.type === 'example')).toMatchObject({
      text: 'Texte relu.',
    });
    expect(typesAvecVariante(relue)).toEqual(['apiculture']);
  });
});

// ——— variantes par niveau (phase 12) ———

function avecVariantesNiveau(): Lesson {
  const premierPrompt = generique.sections.practice.steps.find((e) => e.prompt)?.prompt?.id;
  return {
    ...generique,
    variantesNiveau: {
      debutant: {
        aide: 'Appuyez sur « Copier », puis collez dans l’assistant.',
        ...(premierPrompt ? { indices: { [premierPrompt]: 'Tout est déjà écrit.' } } : {}),
      },
      avance: { defi: 'Demandez-lui maintenant de séparer les faits des suppositions.' },
    },
  };
}

describe('appliquerNiveau', () => {
  it('rend la leçon inchangée sans variante, sans niveau, ou pour un niveau non couvert', () => {
    // Le jour 1 porte de VRAIES variantes de niveau depuis la phase 12 : on
    // fabrique donc explicitement une leçon qui n'en a aucune, au lieu de
    // supposer que la leçon générique en est dépourvue.
    const sansNiveau: Lesson = { ...generique, variantesNiveau: undefined };
    expect(appliquerNiveau(sansNiveau, 'debutant')).toBe(sansNiveau);
    expect(appliquerNiveau(avecVariantesNiveau(), null)).toEqual(avecVariantesNiveau());
    expect(appliquerNiveau(avecVariantesNiveau(), 'intermediaire')).toEqual(avecVariantesNiveau());
  });

  it('ajoute l’aide pour un débutant, sans défi', () => {
    const apres = appliquerNiveau(avecVariantesNiveau(), 'debutant');
    expect(apres.sections.practice.aide).toBe(
      'Appuyez sur « Copier », puis collez dans l’assistant.',
    );
    expect(apres.sections.practice.defi).toBeUndefined();
  });

  it('ajoute le défi pour un avancé, sans aide', () => {
    const apres = appliquerNiveau(avecVariantesNiveau(), 'avance');
    expect(apres.sections.practice.defi).toBe(
      'Demandez-lui maintenant de séparer les faits des suppositions.',
    );
    expect(apres.sections.practice.aide).toBeUndefined();
  });

  it('remplace l’indice du prompt visé', () => {
    const avant = avecVariantesNiveau();
    const id = avant.sections.practice.steps.find((e) => e.prompt)?.prompt?.id;
    const apres = appliquerNiveau(avant, 'debutant');
    const etape = apres.sections.practice.steps.find((e) => e.prompt?.id === id);
    expect(etape?.prompt?.hint).toBe('Tout est déjà écrit.');
  });

  it('ne touche JAMAIS le gabarit d’un prompt (D81 sur le second axe)', () => {
    // Le gabarit porte les garde-fous. Le schéma ne l'expose pas aux
    // variantes de niveau ; ce test le vérifie sur le résultat produit.
    const avant = avecVariantesNiveau();
    for (const niveau of ['debutant', 'avance'] as const) {
      const apres = appliquerNiveau(avant, niveau);
      apres.sections.practice.steps.forEach((etape, index) => {
        expect(etape.prompt?.template).toBe(avant.sections.practice.steps[index]?.prompt?.template);
      });
    }
  });

  it('laisse le concept, le quiz et les garde-fous intacts', () => {
    const avant = avecVariantesNiveau();
    const apres = appliquerNiveau(avant, 'debutant');
    expect(apres.sections.concept).toEqual(avant.sections.concept);
    expect(apres.sections.quiz).toEqual(avant.sections.quiz);
    expect(apres.guardrails).toEqual(avant.guardrails);
  });

  it('ne modifie pas la leçon d’origine', () => {
    const avant = avecVariantesNiveau();
    const copie = structuredClone(avant);
    appliquerNiveau(avant, 'debutant');
    expect(avant).toEqual(copie);
  });

  it('ignore une variante de niveau en brouillon, puis l’affiche une fois relue', () => {
    const brouillon: Lesson = {
      ...generique,
      variantesNiveau: { debutant: { aide: 'Pas encore relue.', brouillon: true } },
    };
    expect(appliquerNiveau(brouillon, 'debutant').sections.practice.aide).toBeUndefined();

    const relue: Lesson = {
      ...generique,
      variantesNiveau: { debutant: { aide: 'Relue.' } },
    };
    expect(appliquerNiveau(relue, 'debutant').sections.practice.aide).toBe('Relue.');
  });

  it('liste les niveaux couverts, hors brouillons', () => {
    expect(niveauxAvecVariante(avecVariantesNiveau())).toEqual(['avance', 'debutant']);
    expect(
      niveauxAvecVariante({
        ...generique,
        variantesNiveau: { debutant: { aide: 'x', brouillon: true }, avance: { defi: 'y' } },
      }),
    ).toEqual(['avance']);
  });
});

describe('appliquerVariantes : les deux axes', () => {
  function lesDeux(): Lesson {
    return { ...avecVariantes(), variantesNiveau: avecVariantesNiveau().variantesNiveau };
  }

  it('applique le métier et le niveau ensemble', () => {
    const apres = appliquerVariantes(lesDeux(), { type: 'apiculture', niveau: 'avance' });
    const exemple = apres.sections.concept.body.find((bloc) => bloc.type === 'example');
    expect(exemple).toMatchObject({ text: 'Yacine conduit 40 ruches à Médéa.' });
    expect(apres.sections.practice.defi).toContain('suppositions');
  });

  it('en cas de conflit sur un indice, le NIVEAU gagne', () => {
    // Le métier décide de quoi on parle, le niveau décide combien on
    // accompagne : c'est l'accompagnement qui doit coller à la personne.
    const avant = lesDeux();
    const id = avant.sections.practice.steps.find((e) => e.prompt)?.prompt?.id;
    const apres = appliquerVariantes(avant, { type: 'apiculture', niveau: 'debutant' });
    const etape = apres.sections.practice.steps.find((e) => e.prompt?.id === id);
    expect(etape?.prompt?.hint).toBe('Tout est déjà écrit.');
  });

  it('un seul axe renseigné suffit', () => {
    const avant = lesDeux();
    expect(
      appliquerVariantes(avant, { type: 'apiculture' }).sections.practice.aide,
    ).toBeUndefined();
    const sansType = appliquerVariantes(avant, { niveau: 'debutant' });
    const exemple = sansType.sections.concept.body.find((bloc) => bloc.type === 'example');
    expect(exemple).toEqual(avant.sections.concept.body.find((bloc) => bloc.type === 'example'));
  });

  it('ne touche pas les gabarits, les deux axes confondus', () => {
    const avant = lesDeux();
    const apres = appliquerVariantes(avant, { type: 'apiculture', niveau: 'debutant' });
    apres.sections.practice.steps.forEach((etape, index) => {
      expect(etape.prompt?.template).toBe(avant.sections.practice.steps[index]?.prompt?.template);
    });
  });
});

// ——— habillage des questions de quiz (phase 15) ———

describe('variante appliquée au quiz', () => {
  function avecQuiz(): Lesson {
    const premiere = generique.sections.quiz.questions[0]!;
    return {
      ...generique,
      variantes: {
        serre: {
          questions: {
            [premiere.id]: {
              text: 'Question habillée pour la serre ?',
              choices: { [premiere.choices[0]!.id]: 'Choix habillé' },
              explanation: 'Explication habillée.',
            },
          },
        },
      },
    };
  }

  it('remplace l’énoncé, le choix visé et l’explication', () => {
    const avant = avecQuiz();
    const apres = appliquerVariante(avant, 'serre');
    const question = apres.sections.quiz.questions[0]!;

    expect(question.text).toBe('Question habillée pour la serre ?');
    expect(question.explanation).toBe('Explication habillée.');
    expect(question.choices[0]?.text).toBe('Choix habillé');
  });

  it('laisse intacts les choix non visés', () => {
    const avant = avecQuiz();
    const apres = appliquerVariante(avant, 'serre');
    apres.sections.quiz.questions[0]?.choices.slice(1).forEach((choix, index) => {
      expect(choix.text).toBe(avant.sections.quiz.questions[0]?.choices[index + 1]?.text);
    });
  });

  it('ne déplace JAMAIS la bonne réponse', () => {
    // Le verrou de ce schéma. `answer` n'est pas exposé aux variantes, et les
    // choix sont remplacés PAR CLÉ : leur nombre et leurs identifiants ne
    // bougent pas, donc la bonne réponse reste ancrée où elle était.
    const avant = avecQuiz();
    const apres = appliquerVariante(avant, 'serre');

    apres.sections.quiz.questions.forEach((question, index) => {
      const origine = avant.sections.quiz.questions[index]!;
      expect(question.answer).toBe(origine.answer);
      expect(question.choices.map((c) => c.id)).toEqual(origine.choices.map((c) => c.id));
      expect(question.choices.some((c) => c.id === question.answer)).toBe(true);
    });
  });

  it('laisse les autres questions du jour intactes', () => {
    const avant = avecQuiz();
    const apres = appliquerVariante(avant, 'serre');
    expect(apres.sections.quiz.questions.slice(1)).toEqual(avant.sections.quiz.questions.slice(1));
  });

  it('ne modifie pas la leçon d’origine', () => {
    const avant = avecQuiz();
    const copie = structuredClone(avant);
    appliquerVariante(avant, 'serre');
    expect(avant).toEqual(copie);
  });
});

describe('le vrai contenu : un serriste ne lit plus d’élevage', () => {
  const ELEVAGE = /brebis|agneau|vache|troupeau|élevage|bétail|poulet|ruche|abeille|cheptel/i;

  it('le jour 1 lui parle de serres, exemple et quiz compris', async () => {
    const jour = await loadLesson(1, 'fr');
    // La variante est encore en brouillon : on l'applique en la relisant,
    // comme le fera la commande de validation.
    const relue: Lesson = {
      ...jour,
      variantes: Object.fromEntries(
        Object.entries(jour.variantes ?? {}).map(([type, v]) => [
          type,
          { ...v, brouillon: undefined },
        ]),
      ),
    };
    const vue = appliquerVariante(relue, 'serre');

    const exemple = vue.sections.concept.body.find((bloc) => bloc.type === 'example');
    expect(exemple && 'text' in exemple ? exemple.text : '').toMatch(/serre/i);

    const q3 = vue.sections.quiz.questions.find((q) => q.id === 'q3');
    expect(q3?.explanation).not.toMatch(ELEVAGE);
    expect(q3?.explanation).toMatch(/serre/i);
  });

  it('le jour 7 lui propose un objectif de serre, pas 40 agneaux', async () => {
    const jour = await loadLesson(7, 'fr');
    const relue: Lesson = {
      ...jour,
      variantes: Object.fromEntries(
        Object.entries(jour.variantes ?? {}).map(([type, v]) => [
          type,
          { ...v, brouillon: undefined },
        ]),
      ),
    };
    const vue = appliquerVariante(relue, 'serre');

    const q1 = vue.sections.quiz.questions.find((q) => q.id === 'q1');
    const bonne = q1?.choices.find((c) => c.id === q1.answer);
    expect(bonne?.text).not.toMatch(ELEVAGE);
    expect(bonne?.text).toMatch(/serre/i);
  });
});
