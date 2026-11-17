import { useTranslation } from 'react-i18next';
import type { Lesson } from '@/content/schema';
import { Card } from '@/components/Card';
import { renderInline } from '@/content/markdown';
import { blocksToPlainText, dossierDraftsFor } from '@/domain/dossier';
import { usePreferences } from '@/store/preferences';

interface ReviewStepProps {
  lesson: Lesson;
  captures: Record<string, string>;
  confidence: number | undefined;
  onConfidence: (value: 1 | 2 | 3 | 4 | 5) => void;
}

const LEVELS = [1, 2, 3, 4, 5] as const;

export function ReviewStep({ lesson, captures, confidence, onConfidence }: ReviewStepProps) {
  const { t } = useTranslation('day');
  const lang = usePreferences((state) => state.lang);
  const drafts = dossierDraftsFor(lesson, captures);

  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" className="sr-only">
        {t('steps.review')}
      </h2>

      <Card as="section" className="mb-4">
        <h3 className="mb-2 font-semibold">{t('review.checklist')}</h3>
        <ul className="list-disc space-y-1 ps-5">
          {lesson.sections.review.checklist.map((item, index) => (
            <li key={index}>{renderInline(item, `cl${index}`)}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" className="mb-4">
        <h3 className="mb-1 font-semibold">{t('review.confidence')}</h3>
        <p className="mb-3 text-sm text-muted">
          {renderInline(lesson.sections.review.confidencePrompt, 'cp')}
        </p>
        <div role="radiogroup" aria-label={t('review.confidence')} className="flex gap-2">
          {LEVELS.map((level) => (
            <label
              key={level}
              className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border text-lg font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${
                confidence === level ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="confidence"
                value={level}
                checked={confidence === level}
                onChange={() => onConfidence(level)}
                className="sr-only"
              />
              {level}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{t('review.confidenceHelp')}</p>
      </Card>

      <Card as="section">
        <h3 className="mb-2 font-semibold">{t('review.dossier')}</h3>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">{t('review.dossierEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((draft) => (
              <li key={draft.kind} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="mb-1 font-medium">{draft.title}</p>
                <p className="text-sm whitespace-pre-wrap text-muted">
                  {blocksToPlainText(draft.blocks, lang)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
