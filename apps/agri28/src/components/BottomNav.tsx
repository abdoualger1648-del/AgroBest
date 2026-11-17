import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ComponentType, SVGProps } from 'react';
import { DayIcon, DossierIcon, HomeIcon, MoreIcon } from './Icon';

interface NavItem {
  to: string;
  labelKey: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'home', Icon: HomeIcon },
  { to: '/jour', labelKey: 'day', Icon: DayIcon },
  { to: '/dossier', labelKey: 'dossier', Icon: DossierIcon },
  { to: '/plus', labelKey: 'more', Icon: MoreIcon },
];

export function BottomNav() {
  const { t } = useTranslation(['nav', 'common']);

  return (
    <nav
      aria-label={t('common:a11y.mainNavigation')}
      className="sticky bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-screen-sm">
        {ITEMS.map(({ to, labelKey, Icon }) => (
          <li key={to} className="flex-1">
            {/* NavLink pose aria-current="page" : inutile d'ajouter un texte masqué,
                qui polluerait le nom accessible du lien. */}
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-medium ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              <Icon width="22" height="22" />
              <span>{t(`nav:${labelKey}`)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
