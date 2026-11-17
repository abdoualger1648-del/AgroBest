import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ComingSoon } from '@/components/ComingSoon';
import { ChevronEndIcon } from '@/components/Icon';
import { usePreferences } from '@/store/preferences';
import { formatNumber } from '@/lib/format';

const TOTAL_DAYS = 28;

export function HomePage() {
  const { t } = useTranslation(['home', 'common']);
  const lang = usePreferences((state) => state.lang);

  // Chiffres figés en phase 1 : la progression réelle arrive en phase 2.
  const done = 0;
  const week = 1;

  return (
    <>
      <header className="mb-5">
        <p className="text-muted">{t('home:greeting')}</p>
        <h1 className="mt-1 text-2xl font-bold">{t('common:appName')}</h1>
        <p className="mt-2 text-muted">{t('home:subtitle')}</p>
      </header>

      <Card className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{t('home:progress.label')}</p>
          <p className="text-sm text-muted">{t('home:progress.week', { week })}</p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {t('home:progress.value', {
            done: formatNumber(done, lang),
            total: formatNumber(TOTAL_DAYS, lang),
          })}
        </p>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_DAYS}
          aria-valuenow={done}
          aria-label={t('home:progress.label')}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ inlineSize: `${(done / TOTAL_DAYS) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">{t('home:progress.streak', { count: 0 })}</p>
      </Card>

      <Card className="mb-4">
        <p className="font-semibold">{t('home:dossier.label')}</p>
        <p className="mt-1 text-sm text-muted">{t('home:dossier.empty')}</p>
      </Card>

      <Button block className="mb-4" disabled>
        {t('home:cta')}
        <ChevronEndIcon className="mirror" width="20" height="20" />
      </Button>

      <ComingSoon note={t('home:phaseNotice')} />
    </>
  );
}
