import type { Lang } from './lang';

/**
 * Locales algériennes. Le système de numération est forcé en chiffres
 * occidentaux (`latn`) : usage courant en Algérie pour les prix et les
 * factures, y compris en arabe. Décision D12 — voir CLAUDE.md.
 */
const LOCALE: Record<Lang, string> = {
  fr: 'fr-DZ-u-nu-latn',
  ar: 'ar-DZ-u-nu-latn',
};

const CURRENCY_SUFFIX: Record<Lang, string> = {
  fr: 'DA',
  ar: 'د.ج',
};

export function localeFor(lang: Lang): string {
  return LOCALE[lang];
}

export function formatNumber(
  value: number,
  lang: Lang,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(LOCALE[lang], options).format(value);
}

/** Montant en dinars algériens, arrondi au dinar. */
export function formatDA(value: number, lang: Lang): string {
  const amount = formatNumber(value, lang, { maximumFractionDigits: 0 });
  return `${amount} ${CURRENCY_SUFFIX[lang]}`;
}

export function formatDate(
  date: Date,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  return new Intl.DateTimeFormat(LOCALE[lang], options).format(date);
}

/** Durée d'un minuteur : mm:ss, toujours en chiffres occidentaux. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatPercent(ratio: number, lang: Lang): string {
  return formatNumber(ratio, lang, { style: 'percent', maximumFractionDigits: 0 });
}
