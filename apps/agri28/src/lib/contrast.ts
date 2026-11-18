/**
 * Calcul du contraste WCAG. Utilisé par les tests pour garantir que les
 * jetons de couleur respectent le niveau AA dans les deux thèmes — une
 * promesse d'accessibilité vérifiée, pas déclarée.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(value: string): Rgb {
  const hex = value.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Couleur invalide : ${value}`);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const sRGB = value / 255;
  return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgb): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** Rapport de contraste WCAG, entre 1 et 21. */
export function contrastRatio(foreground: string, background: string): number {
  const light = relativeLuminance(parseHex(foreground));
  const dark = relativeLuminance(parseHex(background));
  const [high, low] = light > dark ? [light, dark] : [dark, light];
  return (high + 0.05) / (low + 0.05);
}
