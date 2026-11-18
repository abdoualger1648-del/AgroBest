import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ChevronEndIcon } from '@/components/Icon';
import { useAdministrateur } from '@/hooks/useAdministrateur';
import { compteRequis, proposeApk } from '@/config';

const LINKS = [
  { to: '/projet', labelKey: 'project' },
  { to: '/carnet', labelKey: 'notebook' },
  { to: '/modeles', labelKey: 'templates' },
  { to: '/badges', labelKey: 'badges' },
  { to: '/parametres', labelKey: 'settings' },
] as const;

/** Le lien « Mon compte » n'a de sens que là où il existe un compte. */
const LIEN_COMPTE = { to: '/compte', labelKey: 'account' } as const;
const LIEN_ADMIN = { to: '/compte/administration', labelKey: 'admin' } as const;
/** Hors APK, on propose l'application Android : elle marche sans réseau. */
const LIEN_APK = { to: '/telecharger', labelKey: 'apk' } as const;

export function MorePage() {
  const { t } = useTranslation(['nav', 'common', 'compte', 'telechargement']);
  const administrateur = useAdministrateur();

  const liens = [
    ...LINKS,
    ...(compteRequis() ? [LIEN_COMPTE] : []),
    ...(proposeApk() ? [LIEN_APK] : []),
    ...(administrateur ? [LIEN_ADMIN] : []),
  ];

  return (
    <>
      <PageHeader title={t('nav:more')} />
      <ul className="flex flex-col gap-2">
        {liens.map(({ to, labelKey }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 font-medium hover:bg-surface-2"
            >
              <span>
                {labelKey === 'admin'
                  ? t('compte:admin.lien')
                  : labelKey === 'apk'
                    ? t('telechargement:titre')
                    : t(`nav:${labelKey}`)}
              </span>
              <ChevronEndIcon className="mirror shrink-0 text-muted" width="20" height="20" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
