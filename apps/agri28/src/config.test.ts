import { afterEach, describe, expect, it, vi } from 'vitest';
import { compteRequis, edition, emailAdmin, proposeApk } from './config';
import capacitor from '../capacitor.config';

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

describe("l'origine de la vue web de l'APK", () => {
  it('reste https://localhost, sinon toutes les bases installées deviennent orphelines', () => {
    // IndexedDB est rattachée à l'ORIGINE de la vue web. Changer le schéma ou
    // le nom d'hôte de Capacitor ne casse rien de visible : l'application se
    // lance, mais sur une base vide. L'utilisateur y lit la perte de son
    // Dossier, sans aucun message d'erreur, et une mise à jour correctement
    // signée suffirait à la provoquer. D'où ce verrou, qui n'autorise pas de
    // changement silencieux.
    expect(capacitor.server?.androidScheme).toBe('https');
    expect(capacitor.server?.hostname).toBe('localhost');
    expect(capacitor.appId).toBe('dz.agricole360.app');
  });
});
