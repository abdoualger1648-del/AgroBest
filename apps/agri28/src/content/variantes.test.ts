import { beforeAll, describe, expect, it } from 'vitest';
import { loadLesson } from './loader';
import { appliquerVariante, typesAvecVariante } from './variantes';
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
