import { useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/routes/HomePage';
import { MorePage } from '@/routes/MorePage';
import { PlaceholderPage } from '@/routes/PlaceholderPage';
import { SettingsPage } from '@/routes/SettingsPage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { usePreferences } from '@/store/preferences';
import { watchSystemTheme } from '@/lib/appearance';

export default function App() {
  const syncSystemTheme = usePreferences((state) => state.syncSystemTheme);

  useEffect(() => watchSystemTheme(syncSystemTheme), [syncSystemTheme]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="bienvenue" element={<PlaceholderPage screen="onboarding" />} />
        <Route path="projet" element={<PlaceholderPage screen="project" />} />
        <Route path="jour" element={<PlaceholderPage screen="day" />} />
        <Route path="jour/:day" element={<PlaceholderPage screen="day" />} />
        <Route path="dossier" element={<PlaceholderPage screen="dossier" />} />
        <Route path="carnet" element={<PlaceholderPage screen="notebook" />} />
        <Route path="modeles" element={<PlaceholderPage screen="templates" />} />
        <Route path="badges" element={<PlaceholderPage screen="badges" />} />
        <Route path="plus" element={<MorePage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
