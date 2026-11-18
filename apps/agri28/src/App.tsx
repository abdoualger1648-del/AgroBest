import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/routes/HomePage';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { watchSystemTheme } from '@/lib/appearance';
import { showOpenReminder } from '@/pwa/reminder';
import { currentDay } from '@/domain/course';
import { toDayKey } from '@/domain/streak';
import { useCompte } from '@/store/compte';
import { GardeCompte } from '@/components/GardeCompte';

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
const DossierPage = lazy(() =>
  import('@/routes/DossierPage').then((m) => ({ default: m.DossierPage })),
);
const NotebookPage = lazy(() =>
  import('@/routes/NotebookPage').then((m) => ({ default: m.NotebookPage })),
);
const BadgesPage = lazy(() =>
  import('@/routes/BadgesPage').then((m) => ({ default: m.BadgesPage })),
);
const TemplatesPage = lazy(() =>
  import('@/routes/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const NotFoundPage = lazy(() =>
  import('@/routes/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const ComptePage = lazy(() =>
  import('@/routes/compte/ComptePage').then((m) => ({ default: m.ComptePage })),
);
const ConfirmationPage = lazy(() =>
  import('@/routes/compte/ConfirmationPage').then((m) => ({ default: m.ConfirmationPage })),
);
const ActivationPage = lazy(() =>
  import('@/routes/compte/ActivationPage').then((m) => ({ default: m.ActivationPage })),
);
const AdminPage = lazy(() =>
  import('@/routes/compte/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const TelechargerPage = lazy(() =>
  import('@/routes/TelechargerPage').then((m) => ({ default: m.TelechargerPage })),
);
const DossiersPage = lazy(() =>
  import('@/routes/dossiers/DossiersPage').then((m) => ({ default: m.DossiersPage })),
);
const NouveauDossierPage = lazy(() =>
  import('@/routes/dossiers/NouveauDossierPage').then((m) => ({ default: m.NouveauDossierPage })),
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
  const { t } = useTranslation(['common', 'home']);
  const syncSystemTheme = usePreferences((state) => state.syncSystemTheme);
  const reminderEnabled = usePreferences((state) => state.reminderEnabled);
  const progress = useCourse((state) => state.progress);
  const loaded = useCourse((state) => state.loaded);
  const chargerCompte = useCompte((state) => state.charger);

  useEffect(() => watchSystemTheme(syncSystemTheme), [syncSystemTheme]);

  // Le compte est lu depuis le cache local dès le démarrage : l'application
  // doit connaître son état d'accès avant de savoir s'il y a du réseau.
  useEffect(() => {
    void chargerCompte();
  }, [chargerCompte]);

  // Rappel à l'ouverture : le web ne garantit pas mieux sans serveur (D8).
  useEffect(() => {
    if (!loaded) return;
    const today = toDayKey(Date.now());
    const doneToday = progress.some(
      (entry) => entry.completedAt !== undefined && toDayKey(entry.completedAt) === today,
    );
    showOpenReminder({
      enabled: reminderEnabled,
      doneToday,
      title: t('common:appShortName'),
      body: t('home:ctaContinue', { day: currentDay(progress) }),
    });
  }, [loaded, progress, reminderEnabled, t]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="compte" element={<ComptePage />} />
          <Route path="compte/confirmation" element={<ConfirmationPage />} />
          <Route path="compte/activation" element={<ActivationPage />} />
          <Route path="compte/administration" element={<AdminPage />} />
          <Route path="telecharger" element={<TelechargerPage />} />
        </Route>
        <Route element={<GardeCompte />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="bienvenue" element={<OnboardingPage />} />
            <Route path="projet" element={<ProjectPage />} />
            <Route path="dossiers" element={<DossiersPage />} />
            <Route path="dossiers/nouveau" element={<NouveauDossierPage />} />
            <Route path="jour" element={<DayListPage />} />
            <Route path="jour/:day" element={<DayPage />} />
            <Route path="dossier" element={<DossierPage />} />
            <Route path="carnet" element={<NotebookPage />} />
            <Route path="modeles" element={<TemplatesPage />} />
            <Route path="badges" element={<BadgesPage />} />
            <Route path="plus" element={<MorePage />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
