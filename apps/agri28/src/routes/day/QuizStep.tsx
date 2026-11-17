import { useTranslation } from 'react-i18next';
import type { Lesson } from '@/content/schema';
import { Card } from '@/components/Card';
import { CheckIcon } from '@/components/Icon';
import { renderInline } from '@/content/markdown';
import { scoreQuiz } from '@/domain/quiz';

interface QuizStepProps {
  lesson: Lesson;
  answers: Record<string, string>;
  onAnswer: (questionId: string, choiceId: string) => void;
}

export function QuizStep({ lesson, answers, onAnswer }: QuizStepProps) {
  const { t } = useTranslation('day');
  const questions = lesson.sections.quiz.questions;
  const outcome = scoreQuiz(questions, answers);

  return (
    <section aria-labelledby="quiz-title">
      <h2 id="quiz-title" className="sr-only">
        {t('steps.quiz')}
      </h2>

      <ol className="space-y-5">
        {questions.map((question, index) => {
          const given = answers[question.id];
          const answered = given !== undefined;
          const correct = given === question.answer;

          return (
            <li key={question.id}>
              <Card as="article">
                <p className="mb-1 text-sm text-muted">
                  {t('quiz.question', { current: index + 1, total: questions.length })}
                </p>
                <p className="mb-3 font-semibold">
                  {renderInline(question.text, `q-${question.id}`)}
                </p>

                <div role="radiogroup" aria-label={question.text} className="space-y-2">
                  {question.choices.map((choice) => {
                    const selected = given === choice.id;
                    const isRight = answered && choice.id === question.answer;
                    const isWrongPick = answered && selected && !correct;

                    return (
                      <label
                        key={choice.id}
                        className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                          isRight
                            ? 'border-success bg-success/10'
                            : isWrongPick
                              ? 'border-danger bg-danger/10'
                              : 'border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={choice.id}
                          checked={selected}
                          disabled={answered}
                          onChange={() => onAnswer(question.id, choice.id)}
                          className="mt-1 size-5 accent-[var(--c-primary)]"
                        />
                        <span>{renderInline(choice.text, `c-${question.id}-${choice.id}`)}</span>
                        {isRight ? (
                          <CheckIcon
                            className="ms-auto shrink-0 text-success"
                            width="20"
                            height="20"
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>

                {answered ? (
                  <div
                    role="status"
                    className={`mt-3 rounded-xl border p-3 text-sm ${
                      correct ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'
                    }`}
                  >
                    <p className="font-semibold">{correct ? t('quiz.correct') : t('quiz.wrong')}</p>
                    <p className="mt-1">{renderInline(question.explanation, `e-${question.id}`)}</p>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 font-semibold" role="status">
        {outcome.unanswered.length > 0
          ? t('quiz.answerAll')
          : t('quiz.score', { score: outcome.score, total: outcome.total })}
      </p>
    </section>
  );
}
