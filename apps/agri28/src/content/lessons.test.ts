import { describe, expect, it } from 'vitest';
import { availableDays, loadLesson } from './loader';
import { getGuardrail, getTool } from './catalog';
import { makeProject } from '@/test/factories';
import { buildPromptContext, renderPrompt } from '@/domain/prompt';
import { scoreQuiz } from '@/domain/quiz';
import { dossierDraftsFor } from '@/domain/dossier';
import { weekOf } from '@/domain/types';
import type { Lang } from '@/lib/lang';

const WEEK_1 = [1, 2, 3, 4, 5, 6, 7];
const WEEK_2 = [8, 9, 10, 11, 12, 13, 14];
const WRITTEN = [...WEEK_1, ...WEEK_2];
const LANGS: Lang[] = ['fr', 'ar'];

describe('contenu rédigé', () => {
  it('fournit tous les jours écrits dans les deux langues', () => {
    for (const lang of LANGS) {
      expect(availableDays(lang)).toEqual(expect.arrayContaining(WRITTEN));
    }
  });

  for (const day of WRITTEN) {
    describe(`jour ${day}`, () => {
      it('se charge, tombe dans la bonne semaine et dure 15 minutes', async () => {
        for (const lang of LANGS) {
          const lesson = await loadLesson(day, lang);
          const { concept, practice, quiz, review } = lesson.sections;

          expect(lesson.week).toBe(weekOf(day));
          expect(
            concept.durationMin + practice.durationMin + quiz.durationMin + review.durationMin,
          ).toBe(15);
          expect(quiz.questions).toHaveLength(3);
          expect(lesson.draft ?? false).toBe(false);
        }
      });

      it('ne cite que des outils et des garde-fous existants', async () => {
        const lesson = await loadLesson(day, 'fr');
        for (const toolId of lesson.tools) expect(getTool(toolId)).toBeDefined();
        for (const guardrailId of lesson.guardrails) {
          expect(getGuardrail(guardrailId), guardrailId).toBeDefined();
        }
        for (const step of lesson.sections.practice.steps) {
          if (step.prompt) expect(getTool(step.prompt.tool)).toBeDefined();
        }
      });

      it('porte au moins un garde-fou', async () => {
        const lesson = await loadLesson(day, 'fr');
        expect(lesson.guardrails.length).toBeGreaterThan(0);
      });

      it('remplit tous les prompts avec un projet réel, sans variable restante', async () => {
        for (const lang of LANGS) {
          const lesson = await loadLesson(day, lang);
          const context = buildPromptContext(makeProject(), lang, Date.UTC(2026, 10, 17));

          for (const step of lesson.sections.practice.steps) {
            if (!step.prompt) continue;
            const rendered = renderPrompt(step.prompt.template, context, lang);
            expect(rendered, `${lesson.id}.${lang}/${step.prompt.id}`).not.toContain('{{');
            // Marqueur de variable NON résolue (à distinguer d'une consigne
            // « [À COMPLÉTER] » volontairement adressée au modèle).
            expect(rendered).not.toContain('[à compléter :');
            expect(rendered).not.toContain('[يُستكمل :');
          }
        }
      });

      it('a des bonnes réponses cohérentes et une explication par question', async () => {
        for (const lang of LANGS) {
          const lesson = await loadLesson(day, lang);
          const answers = Object.fromEntries(
            lesson.sections.quiz.questions.map((question) => [question.id, question.answer]),
          );
          const outcome = scoreQuiz(lesson.sections.quiz.questions, answers);
          expect(outcome.score).toBe(3);

          for (const question of lesson.sections.quiz.questions) {
            expect(question.explanation.length).toBeGreaterThan(60);
            expect(question.choices.length).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it('garde la même ossature en français et en arabe', async () => {
        const [fr, ar] = await Promise.all([loadLesson(day, 'fr'), loadLesson(day, 'ar')]);
        const shape = (lesson: typeof fr) => ({
          steps: lesson.sections.practice.steps.map((step) => step.id),
          prompts: lesson.sections.practice.steps.flatMap((s) => (s.prompt ? [s.prompt.id] : [])),
          captures: lesson.sections.practice.steps.flatMap((s) =>
            s.capture ? [s.capture.id] : [],
          ),
          dossier: lesson.sections.practice.steps.flatMap((s) =>
            s.capture?.dossier
              ? [`${s.capture.id}:${s.capture.dossier.kind}:${s.capture.dossier.block}`]
              : [],
          ),
          questions: lesson.sections.quiz.questions.map((q) => `${q.id}:${q.answer}`),
          tools: lesson.tools,
          guardrails: lesson.guardrails,
          produces: lesson.produces?.dossierKind ?? null,
          objectives: lesson.objectives.length,
          keyPoints: lesson.sections.concept.keyPoints.length,
          checklist: lesson.sections.review.checklist.length,
        });
        expect(shape(ar)).toEqual(shape(fr));
      });

      it('est réellement rédigé en arabe dans la version arabe', async () => {
        const lesson = await loadLesson(day, 'ar');
        expect(lesson.title).toMatch(/[؀-ۿ]/);
        expect(lesson.sections.concept.body.length).toBeGreaterThan(0);
        const fr = await loadLesson(day, 'fr');
        expect(lesson.title).not.toBe(fr.title);
      });

      it('produit une brique de Dossier quand l’utilisateur remplit ses champs', async () => {
        const lesson = await loadLesson(day, 'fr');
        const captures = Object.fromEntries(
          lesson.sections.practice.steps
            .filter((step) => step.capture)
            .map((step) => [step.capture!.id, 'Réponse de test']),
        );
        const drafts = dossierDraftsFor(lesson, captures);
        expect(drafts.length).toBeGreaterThan(0);
      });
    });
  }

  it('enchaîne les jours : chaque leçon annonce la suivante', async () => {
    for (const day of WRITTEN) {
      const lesson = await loadLesson(day, 'fr');
      expect(lesson.nextTeaser, `jour ${day}`).toBeTruthy();
    }
  });

  it('exige le projet partout sauf au tout premier contact', async () => {
    for (const day of WRITTEN.slice(1)) {
      const lesson = await loadLesson(day, 'fr');
      expect(lesson.requiresProject, `jour ${day}`).toBe(true);
    }
  });

  it('couvre bien le programme de la semaine 1', async () => {
    const titles = await Promise.all(
      WEEK_1.map(async (day) => (await loadLesson(day, 'fr')).title.toLowerCase()),
    );
    const joined = titles.join(' | ');
    expect(joined).toContain('ia'); // jour 1 : ce qu'une IA sait faire
    expect(joined).toContain('prompt'); // jour 2
    expect(joined).toContain('assistants'); // jour 3
    expect(joined).toContain('sources'); // jour 4
    expect(joined).toContain('invente'); // jour 5
    expect(joined).toContain('tape jamais'); // jour 6 : confidentialité
    expect(joined).toContain('objectif'); // jour 7
  });

  it('couvre bien le programme de la semaine 2', async () => {
    const titles = await Promise.all(
      WEEK_2.map(async (day) => (await loadLesson(day, 'fr')).title.toLowerCase()),
    );
    const joined = titles.join(' | ');
    expect(joined).toContain('tient debout'); // jour 8 : faisabilité
    expect(joined).toContain('budget'); // jour 9
    expect(joined).toContain('business plan'); // jour 10
    expect(joined).toContain('douze mois'); // jour 11 : calendrier
    expect(joined).toContain('bras'); // jour 12 : équipe
    expect(joined).toContain('risques'); // jour 13
    expect(joined).toContain('tableau'); // jour 14 : suivi
  });

  it('alimente le Dossier de projet avec des briques variées en semaine 2', async () => {
    const kinds = new Set<string>();
    for (const day of WEEK_2) {
      const lesson = await loadLesson(day, 'fr');
      for (const step of lesson.sections.practice.steps) {
        if (step.capture?.dossier) kinds.add(step.capture.dossier.kind);
      }
    }
    for (const expected of ['budget', 'calendrier', 'equipe', 'risques', 'suivi']) {
      expect(kinds, expected).toContain(expected);
    }
  });

  it('impose les garde-fous là où ils comptent', async () => {
    const vet = await loadLesson(5, 'fr');
    expect(vet.guardrails).toContain('ai_not_vet');
    expect(vet.guardrails).toContain('verify_doses');

    const privacy = await loadLesson(6, 'fr');
    expect(privacy.guardrails).toContain('data_privacy_people');

    // Semaine 2 : argent et droit du travail.
    for (const day of [9, 10, 14]) {
      const lesson = await loadLesson(day, 'fr');
      expect(lesson.guardrails, `jour ${day}`).toContain('ai_not_accountant');
    }
    expect((await loadLesson(12, 'fr')).guardrails).toContain('ai_not_lawyer');
    expect((await loadLesson(11, 'fr')).guardrails).toContain('verify_doses');
  });

  it('n’écrit aucun montant en dinars sans source datée', async () => {
    const money = /\d[\d\s.,\u00a0]*\s?(?:DA|DZD|دج|د\.ج)/u;
    for (const day of WRITTEN) {
      for (const lang of LANGS) {
        const lesson = await loadLesson(day, lang);
        const text = JSON.stringify(lesson);
        if (money.test(text)) {
          expect(lesson.sources?.length, `jour ${day} (${lang})`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cite une source datée dès qu’un texte réglementaire est évoqué', async () => {
    for (const day of [4, 7]) {
      const lesson = await loadLesson(day, 'fr');
      expect(lesson.sources?.length, `jour ${day}`).toBeGreaterThan(0);
      for (const source of lesson.sources ?? []) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
