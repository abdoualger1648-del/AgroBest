import { dirForLang, type Lang } from './lang';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/** Transforme une préférence en thème réellement appliqué. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark = prefersDark(),
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#2f6b46',
  dark: '#11150f',
};

/**
 * Cache de peinture : le script en ligne de index.html le lit pour éviter
 * un clignotement au démarrage. La source de vérité reste IndexedDB.
 */
function cache(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage bloqué (navigation privée) : sans conséquence */
  }
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  const html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);
  cache('agri28.theme', preference);
  return resolved;
}

/**
 * Lit le cache de peinture. Ce cache est écrit de façon SYNCHRONE au moment du
 * clic, alors que l'enregistrement dans IndexedDB est asynchrone : si
 * l'application est fermée entre les deux, le cache est la valeur la plus
 * récente. Au démarrage, il fait donc foi, et il est réécrit dans la base.
 */
export function readCachedTheme(): ThemePreference | null {
  try {
    const value = localStorage.getItem('agri28.theme');
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

export function readCachedLang(): string | null {
  try {
    return localStorage.getItem('agri28.lang');
  } catch {
    return null;
  }
}

export function applyLang(lang: Lang): void {
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', dirForLang(lang));
  cache('agri28.lang', lang);
}

/** Suit les changements de thème du système quand la préférence est « système ». */
export function watchSystemTheme(onChange: (resolved: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(DARK_QUERY);
  const handler = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
