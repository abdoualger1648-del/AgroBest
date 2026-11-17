export const SUPPORTED_LANGS = ['fr', 'ar'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const RTL_LANGS: readonly Lang[] = ['ar'];

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Direction d'écriture d'une langue. Ajouter l'anglais ne changera rien ici. */
export function dirForLang(lang: Lang): 'ltr' | 'rtl' {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

/** Langue de l'appareil, ramenée à une langue prise en charge. */
export function detectDeviceLang(
  navigatorLanguages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : (navigator.languages ?? [navigator.language]),
): Lang {
  for (const tag of navigatorLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'fr';
}
