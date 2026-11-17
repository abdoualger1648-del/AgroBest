import { create } from 'zustand';
import {
  applyLang,
  applyTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/appearance';
import type { Lang } from '@/lib/lang';
import { getProfile, updateProfile } from '@/db/repositories/profile';
import type { ProfileRecord } from '@/db/db';
import { i18next } from '@/i18n';

interface PreferencesState {
  lang: Lang;
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onboardingDone: boolean;
  hydrated: boolean;
  /** Renseigne l'état depuis le profil déjà lu au démarrage. */
  init: (profile: ProfileRecord) => void;
  /** Relit le profil depuis IndexedDB (utilisé après un import de données). */
  hydrate: () => Promise<void>;
  setLang: (lang: Lang) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  /** Appelé quand le thème du système change et que la préférence est « système ». */
  syncSystemTheme: (resolved: ResolvedTheme) => void;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  lang: 'fr',
  theme: 'system',
  resolvedTheme: 'light',
  onboardingDone: false,
  hydrated: false,

  init: (profile) => {
    set({
      lang: profile.lang,
      theme: profile.theme,
      resolvedTheme: resolveTheme(profile.theme),
      onboardingDone: profile.onboardingDone,
      hydrated: true,
    });
  },

  hydrate: async () => {
    const profile = await getProfile();
    applyLang(profile.lang);
    applyTheme(profile.theme);
    await i18next.changeLanguage(profile.lang);
    get().init(profile);
  },

  setLang: async (lang) => {
    if (get().lang === lang) return;
    applyLang(lang);
    await i18next.changeLanguage(lang);
    set({ lang });
    await updateProfile({ lang });
  },

  setTheme: async (theme) => {
    const resolvedTheme = applyTheme(theme);
    set({ theme, resolvedTheme });
    await updateProfile({ theme });
  },

  syncSystemTheme: (resolved) => {
    if (get().theme !== 'system') return;
    document.documentElement.setAttribute('data-theme', resolved);
    set({ resolvedTheme: resolved });
  },
}));
