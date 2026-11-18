import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckIcon, SeedlingIcon } from '@/components/Icon';
import { useCourse } from '@/store/course';
import { usePreferences } from '@/store/preferences';
import { formatDate } from '@/lib/format';
import { summarize } from '@/domain/course';
import { TOTAL_DAYS, type BadgeId } from '@/domain/types';
import { downloadBlob, safeFilename } from '@/export/download';

const WEEK_BADGES: BadgeId[] = ['week-1', 'week-2', 'week-3', 'week-4'];

export function BadgesPage() {
  const { t } = useTranslation(['badges', 'common']);
  const lang = usePreferences((state) => state.lang);
  const project = useCourse((state) => state.project);
  const progress = useCourse((state) => state.progress);
  const badges = useCourse((state) => state.badges);
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');

  const summary = useMemo(() => summarize(progress), [progress]);
  const earnedAt = useMemo(
    () => new Map(badges.map((badge) => [badge.badge, badge.earnedAt])),
    [badges],
  );
  const finished = earnedAt.has('final');

  async function downloadCertificate() {
    if (!project || !finished) return;
    setState('working');
    try {
      const completedOn = new Date(earnedAt.get('final') ?? Date.now());
      const { buildCertificatePdf } = await import('@/export/certificate');
      const blob = await buildCertificatePdf(
        { projectName: project.name, lang, completedOn, daysDone: summary.daysDone },
        {
          appName: t('common:appShortName'),
          title: t('badges:certificate.title'),
          intro: t('badges:certificate.intro'),
          achievement: t('badges:certificate.achievement'),
          dateLine: t('badges:certificate.dateLine', { date: formatDate(completedOn, lang) }),
          disclaimer: t('badges:certificate.disclaimer'),
        },
      );
      downloadBlob(blob, safeFilename(`${t('badges:certificate.title')} ${project.name}`, 'pdf'));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <PageHeader title={t('badges:title')} description={t('badges:subtitle')} />

      <Card className="mb-4">
        <p className="font-semibold">
          {t('badges:progress', { done: summary.daysDone, total: TOTAL_DAYS })}
        </p>
      </Card>

      <ul className="mb-5 space-y-2">
        {WEEK_BADGES.map((badge, index) => {
          const week = index + 1;
          const earned = earnedAt.get(badge);
          return (
            <li key={badge}>
              <Card
                className={`flex items-start gap-3 ${earned ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                    earned ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {earned ? <CheckIcon width="22" height="22" /> : String(week)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t('badges:week', { week })} · {t(`badges:weekNames.${String(week)}`)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {earned
                      ? t('badges:earnedOn', { date: formatDate(new Date(earned), lang) })
                      : t('badges:locked')}
                  </p>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card as="section" className={finished ? 'border-primary/50 bg-primary/5' : ''}>
        <div className="mb-2 flex items-center gap-3">
          <SeedlingIcon className={finished ? 'text-primary' : 'text-muted'} />
          <h2 className="font-semibold">{t('badges:certificate.title')}</h2>
        </div>

        {finished ? (
          <>
            <p className="mb-3 text-sm text-muted">{t('badges:certificate.disclaimer')}</p>
            <Button block disabled={state === 'working'} onClick={() => void downloadCertificate()}>
              {t('badges:certificate.download')}
            </Button>
            {state === 'working' ? (
              <p role="status" className="mt-2 text-sm text-muted">
                {t('badges:certificate.working')}
              </p>
            ) : null}
            {state === 'error' ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {t('badges:certificate.error')}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{t('badges:certificate.locked')}</p>
        )}
      </Card>
    </>
  );
}
