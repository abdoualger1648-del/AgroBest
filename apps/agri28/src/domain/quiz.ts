import type { Question } from '@/content/schema';

export interface QuizOutcome {
  score: number;
  total: number;
  ratio: number;
  correctIds: string[];
  wrongIds: string[];
  unanswered: string[];
}

/** Correction d'un quiz. Aucune note éliminatoire : le quiz enseigne, il ne sanctionne pas. */
export function scoreQuiz(
  questions: readonly Question[],
  answers: Readonly<Record<string, string>>,
): QuizOutcome {
  const correctIds: string[] = [];
  const wrongIds: string[] = [];
  const unanswered: string[] = [];

  for (const question of questions) {
    const given = answers[question.id];
    if (given === undefined) unanswered.push(question.id);
    else if (given === question.answer) correctIds.push(question.id);
    else wrongIds.push(question.id);
  }

  const total = questions.length;
  return {
    score: correctIds.length,
    total,
    ratio: total === 0 ? 0 : correctIds.length / total,
    correctIds,
    wrongIds,
    unanswered,
  };
}

export function isAnswerCorrect(question: Question, answer: string | undefined): boolean {
  return answer !== undefined && answer === question.answer;
}
