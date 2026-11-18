import { useTranslation } from 'react-i18next';
import type { Lesson, Step } from '@/content/schema';
import { BlockRenderer } from '@/components/BlockRenderer';
import { Card } from '@/components/Card';
import { CopyButton } from '@/components/CopyButton';
import { Field, inputClass } from '@/components/Field';
import { renderInline } from '@/content/markdown';
import { getTool } from '@/content/catalog';
import { buildPromptContext, missingVariables, renderPrompt } from '@/domain/prompt';
import type { Project } from '@/domain/types';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { toPlainText } from '@/content/markdown';

interface PracticeStepProps {
  lesson: Lesson;
  project: Project | null;
  captures: Record<string, string>;
  onCapture: (id: string, value: string) => void;
}

function PromptCard({
  step,
  project,
  lessonId,
  day,
}: {
  step: Step;
  project: Project | null;
  lessonId: string;
  day: number;
}) {
  const { t } = useTranslation('day');
  const lang = usePreferences((state) => state.lang);
  const recordPrompt = useCourse((state) => state.recordPrompt);
  const prompt = step.prompt;
  if (!prompt) return null;

  const context = buildPromptContext(project, lang);
  const text = renderPrompt(prompt.template, context, lang);
  const missing = missingVariables(prompt.template, context);
  const tool = getTool(prompt.tool);

  return (
    <Card className="mt-3 bg-surface-2">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
        {t('practice.promptTitle')}
      </p>
      <p className="mb-2 font-semibold">{renderInline(prompt.title, `pt-${prompt.id}`)}</p>

      <pre className="mb-3 max-h-64 overflow-auto rounded-xl border border-border bg-surface p-3 text-sm whitespace-pre-wrap">
        {text}
      </pre>

      {missing.length > 0 ? (
        <p className="mb-3 rounded-xl border border-warning/50 bg-warning/10 p-2 text-sm">
          {t('practice.missingVars', {
            list: missing.map((variable) => variable.replace('project.', '')).join(', '),
          })}
        </p>
      ) : null}

      <CopyButton
        text={text}
        label={t('practice.copy')}
        copiedLabel={t('practice.copied')}
        onCopied={() => {
          // Le prompt copié entre dans le carnet, avec ses variables déjà remplies.
          void recordPrompt({
            day,
            lessonId,
            promptId: prompt.id,
            title: toPlainText(prompt.title),
            tool: prompt.tool,
            lang,
            text,
          });
        }}
      />

      {tool ? (
        <>
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-border font-semibold text-primary"
          >
            {t('practice.openTool', { tool: tool.name })}
          </a>
          {tool.availabilityDZ === 'a_verifier' ? (
            <p className="mt-2 text-sm text-muted">{t('practice.toolUnverified')}</p>
          ) : null}
        </>
      ) : null}

      {prompt.hint ? (
        <p className="mt-3 text-sm text-muted">{renderInline(prompt.hint, `ph-${prompt.id}`)}</p>
      ) : null}

      {prompt.followUps && prompt.followUps.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium">{t('practice.followUps')}</summary>
          <ul className="mt-2 space-y-2">
            {prompt.followUps.map((followUp, index) => (
              <li key={index} className="rounded-xl border border-border bg-surface p-2 text-sm">
                {followUp}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

export function PracticeStep({ lesson, project, captures, onCapture }: PracticeStepProps) {
  const { t } = useTranslation('day');
  const { practice } = lesson.sections;

  return (
    <section aria-labelledby="practice-title">
      <h2 id="practice-title" className="sr-only">
        {t('steps.practice')}
      </h2>

      {practice.intro ? <BlockRenderer blocks={practice.intro} /> : null}

      <ol className="mt-4 space-y-6">
        {practice.steps.map((step, index) => (
          <li key={step.id}>
            <p className="mb-1 text-sm font-semibold text-primary">{index + 1}</p>
            <p>
              {renderInline(step.instruction, `si-${step.id}`)}
              {step.optional ? (
                <span className="ms-2 text-sm text-muted">({t('practice.optional')})</span>
              ) : null}
            </p>

            <PromptCard step={step} project={project} lessonId={lesson.id} day={lesson.day} />

            {step.capture ? (
              <div className="mt-3">
                <Field id={`capture-${step.capture.id}`} label={step.capture.label}>
                  {step.capture.type === 'textarea' ? (
                    <textarea
                      id={`capture-${step.capture.id}`}
                      className={`${inputClass} min-h-28`}
                      value={captures[step.capture.id] ?? ''}
                      onChange={(event) => onCapture(step.capture!.id, event.target.value)}
                      placeholder={step.capture.placeholder}
                      rows={4}
                    />
                  ) : (
                    <input
                      id={`capture-${step.capture.id}`}
                      className={inputClass}
                      type={step.capture.type === 'number' ? 'number' : 'text'}
                      value={captures[step.capture.id] ?? ''}
                      onChange={(event) => onCapture(step.capture!.id, event.target.value)}
                      placeholder={step.capture.placeholder}
                    />
                  )}
                </Field>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
