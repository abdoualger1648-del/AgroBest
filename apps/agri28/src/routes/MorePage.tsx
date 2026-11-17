import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ChevronEndIcon } from '@/components/Icon';

const LINKS = [
  { to: '/projet', labelKey: 'project' },
  { to: '/carnet', labelKey: 'notebook' },
  { to: '/modeles', labelKey: 'templates' },
  { to: '/badges', labelKey: 'badges' },
  { to: '/parametres', labelKey: 'settings' },
] as const;

export function MorePage() {
  const { t } = useTranslation(['nav', 'common']);

  return (
    <>
      <PageHeader title={t('nav:more')} />
      <ul className="flex flex-col gap-2">
        {LINKS.map(({ to, labelKey }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 font-medium hover:bg-surface-2"
            >
              <span>{t(`nav:${labelKey}`)}</span>
              <ChevronEndIcon className="mirror shrink-0 text-muted" width="20" height="20" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
