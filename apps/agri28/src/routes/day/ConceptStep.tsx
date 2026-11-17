import { useTranslation } from 'react-i18next';
import type { Lesson } from '@/content/schema';
import { BlockRenderer } from '@/components/BlockRenderer';
import { Card } from '@/components/Card';
import { renderInline } from '@/content/markdown';

export function ConceptStep({ lesson }: { lesson: Lesson }) {
  const { t } = useTranslation('day');
  const { concept } = lesson.sections;

  return (
    <section aria-labelledby="concept-title">
      <h2 id="concept-title" className="sr-only">
        {t('steps.concept')}
      </h2>

      <BlockRenderer blocks={concept.body} />

      <Card className="mt-4 bg-surface-2">
        <h3 className="mb-2 font-semibold">{t('concept.keyPoints')}</h3>
        <ul className="list-disc space-y-1 ps-5">
          {concept.keyPoints.map((point, index) => (
            <li key={index}>{renderInline(point, `kp${index}`)}</li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
