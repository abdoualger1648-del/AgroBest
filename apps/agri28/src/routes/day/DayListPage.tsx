import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ChevronEndIcon } from '@/components/Icon';
import { computeDayStatuses } from '@/domain/course';
import { TOTAL_DAYS, weekOf, type DayStatus } from '@/domain/types';
import { availableDays } from '@/content/loader';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';

const STATUS_STYLES: Record<DayStatus, string> = {
  done: 'border-success/50 bg-success/10 text-success',
  in_progress: 'border-primary/50 bg-primary/10 text-primary',
  available: 'border-border bg-surface',
  locked: 'border-border bg-surface-2 text-muted',
};

export function DayListPage() {
  const { t } = useTranslation('day');
  const lang = usePreferences((state) => state.lang);
  const progress = useCourse((state) => state.progress);
  const statuses = useMemo(() => computeDayStatuses(progress), [progress]);
  const withContent = useMemo(() => new Set(availableDays(lang)), [lang]);

  const weeks = [1, 2, 3, 4].map((week) => ({
    week,
    days: Array.from({ length: TOTAL_DAYS }, (_, index) => index + 1).filter(
      (day) => weekOf(day) === week,
    ),
  }));

  return (
    <>
      <PageHeader title={t('list.title')} description={t('list.subtitle')} />

      {weeks.map(({ week, days }) => (
        <section key={week} className="mb-6">
          <h2 className="mb-2 font-semibold">{t('list.week', { week })}</h2>
          <ul className="space-y-2">
            {days.map((day) => {
              const status = statuses.get(day) ?? 'locked';
              const hasContent = withContent.has(day);
              const row = (
                <div
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 ${STATUS_STYLES[status]}`}
                >
                  <span className="w-8 shrink-0 font-semibold tabular-nums">{day}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t('list.day', { day })}</span>
                    <span className="block text-sm opacity-80">
                      {t(`status.${status}`)}
                      {hasContent ? '' : ` · ${t('missing.title')}`}
                    </span>
                  </span>
                  {status !== 'locked' && hasContent ? (
                    <ChevronEndIcon className="mirror shrink-0" width="20" height="20" />
                  ) : null}
                </div>
              );

              return (
                <li key={day}>
                  {status !== 'locked' && hasContent ? (
                    <Link to={`/jour/${String(day)}`}>{row}</Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
