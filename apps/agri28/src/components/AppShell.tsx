import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BottomNav } from './BottomNav';
import { UpdateToast } from './UpdateToast';
import { SeedlingIcon, SettingsIcon } from './Icon';

export function AppShell() {
  const { t } = useTranslation(['common', 'nav']);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:m-2 focus:rounded-lg focus:bg-surface focus:p-3"
      >
        {t('common:a11y.skipToContent')}
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-screen-sm items-center gap-3 px-4 py-3">
          <SeedlingIcon className="shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {t('common:appShortName')}
          </p>
          <Link
            to="/parametres"
            aria-label={t('nav:settings')}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-screen-sm flex-1 px-4 py-5">
        <Outlet />
      </main>

      <UpdateToast />
      <BottomNav />
    </div>
  );
}
