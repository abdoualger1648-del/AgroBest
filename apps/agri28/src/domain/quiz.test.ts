import { describe, expect, it } from 'vitest';
import type { Question } from '@/content/schema';
import { isAnswerCorrect, scoreQuiz } from './quiz';

const questions: Question[] = [
  {
    id: 'q1',
    text: 'Question 1',
    choices: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
    ],
    answer: 'b',
    explanation: 'Parce que B.',
  },
  {
    id: 'q2',
    text: 'Question 2',
    choices: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
    ],
    answer: 'a',
    explanation: 'Parce que A.',
  },
  {
    id: 'q3',
    text: 'Question 3',
    choices: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
    ],
    answer: 'c',
    explanation: 'Parce que C.',
  },
];

describe('quiz', () => {
  it('corrige un sans-faute', () => {
    const outcome = scoreQuiz(questions, { q1: 'b', q2: 'a', q3: 'c' });
    expect(outcome.score).toBe(3);
    expect(outcome.total).toBe(3);
    expect(outcome.ratio).toBe(1);
    expect(outcome.wrongIds).toEqual([]);
  });

  it('distingue erreurs et questions sans réponse', () => {
    const outcome = scoreQuiz(questions, { q1: 'a', q2: 'a' });
    expect(outcome.score).toBe(1);
    expect(outcome.correctIds).toEqual(['q2']);
    expect(outcome.wrongIds).toEqual(['q1']);
    expect(outcome.unanswered).toEqual(['q3']);
  });

  it('ne sanctionne pas : un score faible reste un score', () => {
    const outcome = scoreQuiz(questions, { q1: 'c', q2: 'c', q3: 'a' });
    expect(outcome.score).toBe(0);
    expect(outcome.ratio).toBe(0);
  });

  it('dit si une réponse donnée est juste', () => {
    expect(isAnswerCorrect(questions[0]!, 'b')).toBe(true);
    expect(isAnswerCorrect(questions[0]!, 'a')).toBe(false);
    expect(isAnswerCorrect(questions[0]!, undefined)).toBe(false);
  });
});
