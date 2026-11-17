import { describe, expect, it } from 'vitest';
import { detectDeviceLang, dirForLang, isLang, SUPPORTED_LANGS } from './lang';

describe('langues', () => {
  it('reconnaît les langues prises en charge', () => {
    expect(SUPPORTED_LANGS).toEqual(['fr', 'ar']);
    expect(isLang('fr')).toBe(true);
    expect(isLang('ar')).toBe(true);
    expect(isLang('en')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it('donne la direction d’écriture', () => {
    expect(dirForLang('fr')).toBe('ltr');
    expect(dirForLang('ar')).toBe('rtl');
  });

  it('déduit la langue de l’appareil et retombe sur le français', () => {
    expect(detectDeviceLang(['ar-DZ', 'fr-FR'])).toBe('ar');
    expect(detectDeviceLang(['fr-DZ'])).toBe('fr');
    expect(detectDeviceLang(['en-US', 'ar'])).toBe('ar');
    expect(detectDeviceLang(['en-US'])).toBe('fr');
    expect(detectDeviceLang([])).toBe('fr');
  });
});
