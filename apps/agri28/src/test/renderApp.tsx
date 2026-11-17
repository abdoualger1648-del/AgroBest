import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '@/App';
import { initI18n } from '@/i18n';
import { applyLang, applyTheme } from '@/lib/appearance';
import { getProfile, updateProfile } from '@/db/repositories/profile';
import { usePreferences } from '@/store/preferences';
import type { Lang } from '@/lib/lang';

/** Monte l'application complète dans la langue demandée, comme au démarrage. */
export async function renderApp(lang: Lang = 'fr', route = '/'): Promise<RenderResult> {
  await getProfile();
  const profile = await updateProfile({ lang });
  applyLang(profile.lang);
  applyTheme(profile.theme);
  usePreferences.getState().init(profile);
  await initI18n(profile.lang);

  const tree: ReactElement = (
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
  return render(tree);
}
