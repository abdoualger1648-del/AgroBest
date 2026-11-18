import { beforeEach, describe, expect, it } from 'vitest';
import {
  availableDays,
  clearLessonCache,
  hasLesson,
  loadLesson,
  LessonNotFoundError,
} from './loader';
import { lessonSchema } from './schema';
import { getGuardrailText, getTool, listTools, listWilayas, wilayaName } from './catalog';

describe('chargement du contenu', () => {
  beforeEach(() => {
    clearLessonCache();
  });

  it('expose les jours réellement présents', () => {
    expect(availableDays()).toContain(1);
    expect(availableDays('fr')).toContain(1);
    expect(availableDays('ar')).toContain(1);
  });

  it('charge et valide le jour 1 dans les deux langues', async () => {
    const fr = await loadLesson(1, 'fr');
    const ar = await loadLesson(1, 'ar');

    expect(fr.lang).toBe('fr');
    expect(ar.lang).toBe('ar');
    expect(fr.day).toBe(1);
    expect(fr.sections.quiz.questions).toHaveLength(3);
    expect(ar.title).toMatch(/[؀-ۿ]/);
  });

  it('garde la même ossature entre les deux langues', async () => {
    const fr = await loadLesson(1, 'fr');
    const ar = await loadLesson(1, 'ar');

    const ids = (lesson: typeof fr) => ({
      steps: lesson.sections.practice.steps.map((step) => step.id),
      prompts: lesson.sections.practice.steps.flatMap((s) => (s.prompt ? [s.prompt.id] : [])),
      captures: lesson.sections.practice.steps.flatMap((s) => (s.capture ? [s.capture.id] : [])),
      questions: lesson.sections.quiz.questions.map((question) => question.id),
    });

    expect(ids(ar)).toEqual(ids(fr));
    expect(ar.tools).toEqual(fr.tools);
    expect(ar.guardrails).toEqual(fr.guardrails);
  });

  it('signale clairement une leçon absente', async () => {
    // Les 28 jours existent : on vérifie le comportement hors parcours.
    expect(hasLesson(99, 'fr')).toBe(false);
    await expect(loadLesson(99, 'fr')).rejects.toBeInstanceOf(LessonNotFoundError);
  });

  it('met la leçon en cache après le premier chargement', async () => {
    const first = await loadLesson(1, 'fr');
    const second = await loadLesson(1, 'fr');
    expect(second).toBe(first);
  });
});

describe('schéma de leçon', () => {
  const valid = {
    schema: 1,
    id: 'day-02',
    day: 2,
    week: 1,
    lang: 'fr',
    title: 'Titre',
    subtitle: 'Sous-titre',
    durationMin: 15,
    objectives: ['Objectif un', 'Objectif deux'],
    tools: ['claude'],
    requiresProject: true,
    guardrails: ['verify_prices'],
    sections: {
      concept: { durationMin: 3, body: [{ type: 'p', text: 'Texte' }], keyPoints: ['Point'] },
      practice: { durationMin: 7, steps: [{ id: 's1', instruction: 'Faire' }] },
      quiz: {
        durationMin: 3,
        questions: [1, 2, 3].map((n) => ({
          id: `q${n}`,
          text: 'Question',
          choices: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
            { id: 'c', text: 'C' },
          ],
          answer: 'a',
          explanation: 'Explication',
        })),
      },
      review: {
        durationMin: 2,
        checklist: ['Fait'],
        confidencePrompt: 'Confiance ?',
        dossierPreview: true,
      },
    },
  };

  it('accepte une leçon conforme', () => {
    expect(lessonSchema.safeParse(valid).success).toBe(true);
  });

  it('refuse une somme de durées différente de 15 minutes', () => {
    const broken = structuredClone(valid);
    broken.sections.concept.durationMin = 5;
    const result = lessonSchema.safeParse(broken);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('17 min');
  });

  it('refuse une bonne réponse absente des choix', () => {
    const broken = structuredClone(valid);
    broken.sections.quiz.questions[0]!.answer = 'z';
    expect(lessonSchema.safeParse(broken).success).toBe(false);
  });

  it('refuse un quiz qui n’a pas exactement 3 questions', () => {
    const broken = structuredClone(valid);
    broken.sections.quiz.questions = broken.sections.quiz.questions.slice(0, 2);
    expect(lessonSchema.safeParse(broken).success).toBe(false);
  });

  it('refuse une semaine incohérente avec le jour', () => {
    const broken = structuredClone(valid);
    broken.week = 2;
    expect(lessonSchema.safeParse(broken).success).toBe(false);
  });

  it('refuse un identifiant incohérent avec le numéro du jour', () => {
    const broken = structuredClone(valid);
    broken.id = 'day-09';
    expect(lessonSchema.safeParse(broken).success).toBe(false);
  });
});

describe('catalogues', () => {
  it('contient les 69 wilayas et les nomme dans les deux langues', () => {
    expect(listWilayas('fr')).toHaveLength(69);
    expect(wilayaName('16', 'fr')).toBe('Alger');
    expect(wilayaName('16', 'ar')).toBe('الجزائر');
    expect(wilayaName('99', 'fr')).toBeUndefined();
  });

  it('trie les wilayas selon la langue affichée', () => {
    const fr = listWilayas('fr').map((wilaya) => wilaya.name_fr);
    expect(fr).toEqual([...fr].sort(new Intl.Collator('fr-DZ').compare));
  });

  it('donne le texte des garde-fous dans les deux langues', () => {
    expect(getGuardrailText('ai_not_vet', 'fr')).toContain('vétérinaire');
    expect(getGuardrailText('ai_not_vet', 'ar')).toMatch(/[؀-ۿ]/);
    expect(getGuardrailText('inexistant', 'fr')).toBeUndefined();
  });

  it('porte l’état de vérification de chaque outil', () => {
    expect(getTool('claude')?.availabilityDZ).toBe('oui');
    expect(getTool('claude')?.source).toContain('anthropic.com');
    for (const tool of listTools()) {
      expect(tool.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
