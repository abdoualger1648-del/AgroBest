import { afterEach, describe, expect, it, vi } from 'vitest';
import { compteRequis, edition, emailAdmin } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('édition', () => {
  it('vaut « complete » par défaut : les tests et le développement ne sont jamais verrouillés', () => {
    expect(edition()).toBe('complete');
    expect(compteRequis()).toBe(false);
  });

  it('retombe sur « complete » si la valeur est inconnue, au lieu de verrouiller par accident', () => {
    vi.stubEnv('VITE_EDITION', 'APK');
    expect(edition()).toBe('complete');
    vi.stubEnv('VITE_EDITION', 'n’importe quoi');
    expect(edition()).toBe('complete');
  });

  it('en APK, le compte est requis', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    expect(compteRequis()).toBe(true);
  });

  it('la vitrine est reconnue, sans compte (son plafond arrive en 8d)', () => {
    vi.stubEnv('VITE_EDITION', 'vitrine');
    expect(edition()).toBe('vitrine');
    expect(compteRequis()).toBe(false);
  });
});

describe('adresse de l’administrateur', () => {
  it('est vide tant qu’elle n’est pas fournie', () => {
    expect(emailAdmin()).toBe('');
  });

  it('est lue depuis la configuration de build', () => {
    vi.stubEnv('VITE_EMAIL_ADMIN', 'admin@example.dz');
    expect(emailAdmin()).toBe('admin@example.dz');
  });
});
