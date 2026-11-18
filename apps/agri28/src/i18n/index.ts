import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Lang } from '@/lib/lang';

import frCommon from './locales/fr/common.json';
import frNav from './locales/fr/nav.json';
import frHome from './locales/fr/home.json';
import frSettings from './locales/fr/settings.json';
import frScreens from './locales/fr/screens.json';
import frProject from './locales/fr/project.json';
import frDay from './locales/fr/day.json';
import frDossier from './locales/fr/dossier.json';
import frNotebook from './locales/fr/notebook.json';
import frBadges from './locales/fr/badges.json';
import frTemplates from './locales/fr/templates.json';

import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arHome from './locales/ar/home.json';
import arSettings from './locales/ar/settings.json';
import arScreens from './locales/ar/screens.json';
import arProject from './locales/ar/project.json';
import arDay from './locales/ar/day.json';
import arDossier from './locales/ar/dossier.json';
import arNotebook from './locales/ar/notebook.json';
import arBadges from './locales/ar/badges.json';
import arTemplates from './locales/ar/templates.json';

export const NAMESPACES = [
  'common',
  'nav',
  'home',
  'settings',
  'screens',
  'project',
  'day',
  'dossier',
  'notebook',
  'badges',
  'templates',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * Les libellés d'interface sont importés statiquement : quelques kilo-octets,
 * disponibles hors ligne dès le premier chargement. Le CONTENU pédagogique,
 * lui, passera par un chargement à la demande (src/content, phase 2).
 */
export const resources = {
  fr: {
    common: frCommon,
    nav: frNav,
    home: frHome,
    settings: frSettings,
    screens: frScreens,
    project: frProject,
    day: frDay,
    dossier: frDossier,
    notebook: frNotebook,
    badges: frBadges,
    templates: frTemplates,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    home: arHome,
    settings: arSettings,
    screens: arScreens,
    project: arProject,
    day: arDay,
    dossier: arDossier,
    notebook: arNotebook,
    badges: arBadges,
    templates: arTemplates,
  },
} as const;

export async function initI18n(lang: Lang): Promise<i18n> {
  if (i18next.isInitialized) {
    await i18next.changeLanguage(lang);
    return i18next;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'ar'],
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });

  return i18next;
}

export { i18next };
