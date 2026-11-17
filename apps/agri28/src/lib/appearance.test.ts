import { beforeEach, describe, expect, it } from 'vitest';
import { applyLang, applyTheme, isThemePreference, resolveTheme } from './appearance';

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
