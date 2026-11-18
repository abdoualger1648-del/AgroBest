import { afterEach, describe, expect, it, vi } from 'vitest';
import { compteRequis, edition, emailAdmin, proposeApk } from './config';

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

  it('en APK, le compte est requis et l’application n’est pas proposée', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    expect(compteRequis()).toBe(true);
    // On est déjà dedans : proposer de la télécharger n'aurait pas de sens.
    expect(proposeApk()).toBe(false);
  });

  it('sur le web, le compte est requis aussi, et l’APK est proposé', () => {
    vi.stubEnv('VITE_EDITION', 'web');
    expect(edition()).toBe('web');
    expect(compteRequis()).toBe(true);
    expect(proposeApk()).toBe(true);
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
