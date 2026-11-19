import { create } from 'zustand';
import {
  applyLang,
  applyTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/appearance';
import type { Lang } from '@/lib/lang';
import type { NiveauParcours, ScoresNiveau } from '@/domain/niveau';
import { getProfile, updateProfile } from '@/db/repositories/profile';
import type { ProfileRecord } from '@/db/db';
import { i18next } from '@/i18n';

interface PreferencesState {
  lang: Lang;
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onboardingDone: boolean;
  reminderEnabled: boolean;
  reminderTime: string | null;
  /** Niveau de parcours ; `null` tant que le test n'a pas été passé. */
  niveauParcours: NiveauParcours | null;
  niveauScores: ScoresNiveau | null;
  niveauEvalueLe: number | null;
  hydrated: boolean;
  /** Renseigne l'état depuis le profil déjà lu au démarrage. */
  init: (profile: ProfileRecord) => void;
  /** Relit le profil depuis IndexedDB (utilisé après un import de données). */
  hydrate: () => Promise<void>;
  setLang: (lang: Lang) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setReminder: (enabled: boolean, time: string) => Promise<void>;
  /** Enregistre le résultat du test de niveau (phase 12). */
  enregistrerNiveau: (niveau: NiveauParcours, scores: ScoresNiveau) => Promise<void>;
  /** Appelé quand le thème du système change et que la préférence est « système ». */
  syncSystemTheme: (resolved: ResolvedTheme) => void;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  lang: 'fr',
  theme: 'system',
  resolvedTheme: 'light',
  onboardingDone: false,
  reminderEnabled: false,
  reminderTime: null,
  niveauParcours: null,
  niveauScores: null,
  niveauEvalueLe: null,
  hydrated: false,

  init: (profile) => {
    set({
      lang: profile.lang,
      theme: profile.theme,
      resolvedTheme: resolveTheme(profile.theme),
      onboardingDone: profile.onboardingDone,
      reminderEnabled: profile.reminderEnabled,
      reminderTime: profile.reminderTime,
      niveauParcours: profile.niveauParcours,
      niveauScores: profile.niveauScores,
      niveauEvalueLe: profile.niveauEvalueLe,
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

  setReminder: async (enabled, time) => {
    set({ reminderEnabled: enabled, reminderTime: time });
    await updateProfile({ reminderEnabled: enabled, reminderTime: time });
  },

  enregistrerNiveau: async (niveau, scores) => {
    const niveauEvalueLe = Date.now();
    set({ niveauParcours: niveau, niveauScores: scores, niveauEvalueLe });
    await updateProfile({ niveauParcours: niveau, niveauScores: scores, niveauEvalueLe });
  },

  syncSystemTheme: (resolved) => {
    if (get().theme !== 'system') return;
    document.documentElement.setAttribute('data-theme', resolved);
    set({ resolvedTheme: resolved });
  },
}));
