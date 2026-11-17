import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyLang,
  applyTheme,
  isThemePreference,
  readCachedLang,
  readCachedTheme,
  resolveTheme,
} from './appearance';

describe('apparence', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('valide les préférences de thème', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
  });

  it('résout la préférence « système » selon le réglage de l’appareil', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('applique le thème sur <html> et le met en cache', () => {
    const resolved = applyTheme('dark');
    expect(resolved).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('agri28.theme')).toBe('dark');
  });

  it('applique langue et direction sur <html>', () => {
    applyLang('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(localStorage.getItem('agri28.lang')).toBe('ar');

    applyLang('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});

describe('cache de peinture', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('relit la préférence de thème écrite au clic', () => {
    expect(readCachedTheme()).toBeNull();
    applyTheme('dark');
    expect(readCachedTheme()).toBe('dark');
  });

  it('ignore une valeur de thème corrompue', () => {
    localStorage.setItem('agri28.theme', 'sepia');
    expect(readCachedTheme()).toBeNull();
  });

  it('relit la langue écrite au clic', () => {
    expect(readCachedLang()).toBeNull();
    applyLang('ar');
    expect(readCachedLang()).toBe('ar');
  });
});
