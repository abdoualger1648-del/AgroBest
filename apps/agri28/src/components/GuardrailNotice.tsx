import { useTranslation } from 'react-i18next';
import { getGuardrail } from '@/content/catalog';
import { usePreferences } from '@/store/preferences';

const STYLES = {
  info: 'border-primary/40 bg-primary/5',
  warning: 'border-warning/50 bg-warning/10',
  danger: 'border-danger/50 bg-danger/10',
} as const;

/**
 * Garde-fous pédagogiques : affichés dans le flux de la leçon, à l'endroit
 * où le risque existe, jamais relégués sur une page que personne ne lit.
 */
export function GuardrailNotice({ ids }: { ids: readonly string[] }) {
  const { t } = useTranslation('day');
  const lang = usePreferences((state) => state.lang);
  const guardrails = ids.map((id) => getGuardrail(id)).filter((item) => item !== undefined);

  if (guardrails.length === 0) return null;

  return (
    <section aria-labelledby="guardrails-title" className="mt-6">
      <h2 id="guardrails-title" className="mb-2 text-sm font-semibold text-muted">
        {t('guardrails.title')}
      </h2>
      <ul className="space-y-2">
        {guardrails.map((guardrail) => (
          <li
            key={guardrail.id}
            className={`rounded-xl border p-3 text-sm ${STYLES[guardrail.severity]}`}
          >
            {guardrail.text[lang]}
          </li>
        ))}
      </ul>
    </section>
  );
}
