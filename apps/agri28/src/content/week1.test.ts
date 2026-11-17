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
const LANGS: Lang[] = ['fr', 'ar'];

describe('contenu de la semaine 1', () => {
  it('fournit les sept jours dans les deux langues', () => {
    for (const lang of LANGS) {
      expect(availableDays(lang)).toEqual(expect.arrayContaining(WEEK_1));
    }
  });

  for (const day of WEEK_1) {
    describe(`jour ${day}`, () => {
      it('se charge, appartient à la semaine 1 et dure 15 minutes', async () => {
        for (const lang of LANGS) {
          const lesson = await loadLesson(day, lang);
          const { concept, practice, quiz, review } = lesson.sections;

          expect(lesson.week).toBe(weekOf(day));
          expect(lesson.week).toBe(1);
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
            expect(rendered).not.toContain('à compléter');
            expect(rendered).not.toContain('يُستكمل');
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
    for (const day of WEEK_1) {
      const lesson = await loadLesson(day, 'fr');
      expect(lesson.nextTeaser, `jour ${day}`).toBeTruthy();
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

  it('impose les garde-fous là où ils comptent', async () => {
    const vet = await loadLesson(5, 'fr');
    expect(vet.guardrails).toContain('ai_not_vet');
    expect(vet.guardrails).toContain('verify_doses');

    const privacy = await loadLesson(6, 'fr');
    expect(privacy.guardrails).toContain('data_privacy_people');
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
