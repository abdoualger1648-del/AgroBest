import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/routes/HomePage';
import { usePreferences } from '@/store/preferences';
import { watchSystemTheme } from '@/lib/appearance';

/**
 * Seul l'accueil est dans le paquet initial. Les autres écrans arrivent à la
 * demande : sur une connexion faible, on ne télécharge que ce qu'on ouvre.
 */
const OnboardingPage = lazy(() =>
  import('@/routes/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const ProjectPage = lazy(() =>
  import('@/routes/ProjectPage').then((m) => ({ default: m.ProjectPage })),
);
const DayPage = lazy(() => import('@/routes/day/DayPage').then((m) => ({ default: m.DayPage })));
const DayListPage = lazy(() =>
  import('@/routes/day/DayListPage').then((m) => ({ default: m.DayListPage })),
);
const MorePage = lazy(() => import('@/routes/MorePage').then((m) => ({ default: m.MorePage })));
const SettingsPage = lazy(() =>
  import('@/routes/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PlaceholderPage = lazy(() =>
  import('@/routes/PlaceholderPage').then((m) => ({ default: m.PlaceholderPage })),
);
const NotFoundPage = lazy(() =>
  import('@/routes/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

function RouteFallback() {
  const { t } = useTranslation('common');
  return (
    <p role="status" className="text-muted">
      {t('status.loading')}
    </p>
  );
}

export default function App() {
  const syncSystemTheme = usePreferences((state) => state.syncSystemTheme);

  useEffect(() => watchSystemTheme(syncSystemTheme), [syncSystemTheme]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="bienvenue" element={<OnboardingPage />} />
          <Route path="projet" element={<ProjectPage />} />
          <Route path="jour" element={<DayListPage />} />
          <Route path="jour/:day" element={<DayPage />} />
          <Route path="dossier" element={<PlaceholderPage screen="dossier" />} />
          <Route path="carnet" element={<PlaceholderPage screen="notebook" />} />
          <Route path="modeles" element={<PlaceholderPage screen="templates" />} />
          <Route path="badges" element={<PlaceholderPage screen="badges" />} />
          <Route path="plus" element={<MorePage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
