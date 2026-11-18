import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ChevronEndIcon } from '@/components/Icon';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { currentDay as computeCurrentDay, summarize } from '@/domain/course';
import { formatNumber } from '@/lib/format';
import { TOTAL_DAYS } from '@/domain/types';

export function HomePage() {
  const { t } = useTranslation(['home', 'common', 'project']);
  const lang = usePreferences((state) => state.lang);

  const project = useCourse((state) => state.project);
  const dossierCount = useCourse((state) => state.dossierCount);
  const progress = useCourse((state) => state.progress);

  // Les valeurs dérivées sont calculées ici, pas dans un sélecteur :
  // un sélecteur qui crée un objet à chaque appel fait boucler le store.
  const summary = useMemo(() => summarize(progress), [progress]);
  const currentDay = useMemo(() => computeCurrentDay(progress), [progress]);
  // La série est calculée dans le store, à l'écriture : Date.now() n'a pas sa place dans un rendu.
  const streak = useCourse((state) => state.streak);

  const ratioPercent = Math.round(summary.ratio * 100);

  return (
    <>
      <header className="mb-5">
        <p className="text-muted">{t('home:greeting')}</p>
        <h1 className="mt-1 text-2xl font-bold">{project?.name ?? t('common:appName')}</h1>
        <p className="mt-2 text-muted">{t('home:subtitle')}</p>
      </header>

      <Card className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{t('home:progress.label')}</p>
          <p className="text-sm text-muted">
            {t('home:progress.week', { week: summary.currentWeek })}
          </p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {t('home:progress.value', {
            done: formatNumber(summary.daysDone, lang),
            total: formatNumber(TOTAL_DAYS, lang),
          })}
        </p>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_DAYS}
          aria-valuenow={summary.daysDone}
          aria-label={t('home:progress.label')}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ inlineSize: `${ratioPercent}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {t('home:progress.streak', { count: streak.current })}
        </p>
      </Card>

      <Link to="/dossier" className="mb-4 block">
        <Card>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t('home:dossier.label')}</p>
              <p className="mt-1 text-sm text-muted">
                {dossierCount === 0
                  ? t('home:dossier.empty')
                  : t('home:dossier.count', { count: dossierCount })}
              </p>
            </div>
            <ChevronEndIcon className="mirror shrink-0 text-muted" width="20" height="20" />
          </div>
        </Card>
      </Link>

      {project ? (
        <Link to={`/jour/${String(currentDay)}`} className="block">
          <Button block className="mb-4">
            {summary.allDone
              ? t('home:ctaDone')
              : summary.daysDone === 0
                ? t('home:cta')
                : t('home:ctaContinue', { day: currentDay })}
            <ChevronEndIcon className="mirror" width="20" height="20" />
          </Button>
        </Link>
      ) : (
        <Link to="/bienvenue" className="block">
          <Button block className="mb-4">
            {t('project:none.cta')}
            <ChevronEndIcon className="mirror" width="20" height="20" />
          </Button>
        </Link>
      )}

      <Link to="/projet" className="block">
        <Card>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t('home:project.label')}</p>
              <p className="mt-1 truncate text-sm text-muted">
                {project?.objective ?? t('home:project.none')}
              </p>
            </div>
            <ChevronEndIcon className="mirror shrink-0 text-muted" width="20" height="20" />
          </div>
        </Card>
      </Link>
    </>
  );
}
