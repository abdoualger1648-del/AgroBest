import { afterEach, describe, expect, it, vi } from 'vitest';
import { compteRequis, edition, emailAdmin, fournisseursDisponibles, proposeApk } from './config';
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

  it('laisse le SDK JavaScript ouvrir la session, jamais le plugin natif', () => {
    // `skipNativeAuth` est le pivot de la phase 16. Sans lui, le plugin ouvre
    // une session NATIVE, tandis que l'application — qui vit dans la vue web
    // — reste anonyme : écran de compte vide, règles Firestore refusées,
    // administration invisible, alors que la connexion a « réussi ». Le
    // retirer ne casse aucun type et aucun écran : d'où ce verrou.
    const plugin = capacitor.plugins?.FirebaseAuthentication;
    expect(plugin?.skipNativeAuth).toBe(true);
    // Le plugin ne charge que les fournisseurs nommés : liste vide par
    // défaut, et `signInWithGoogle` échouerait sans cette déclaration.
    expect(plugin?.providers).toContain('google.com');
  });
});

describe('fournisseurs proposés dans l’APK (phase 16)', () => {
  it('aucun par défaut : un APK sans configuration native n’affiche pas de bouton', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    expect(fournisseursDisponibles()).toEqual([]);
  });

  it('ceux que le build déclare, et eux seuls', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    vi.stubEnv('VITE_FOURNISSEURS_APK', 'google');
    expect([...fournisseursDisponibles()]).toEqual(['google']);

    vi.stubEnv('VITE_FOURNISSEURS_APK', 'google,facebook');
    expect([...fournisseursDisponibles()]).toEqual(['google', 'facebook']);
  });

  it('garde l’ordre de l’application et refuse doublons et noms inconnus', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    vi.stubEnv('VITE_FOURNISSEURS_APK', 'facebook, google , facebook, twitter');
    expect([...fournisseursDisponibles()]).toEqual(['google', 'facebook']);
  });

  it('une faute de frappe dans le secret n’affiche aucun bouton, plutôt qu’un bouton qui échoue', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    vi.stubEnv('VITE_FOURNISSEURS_APK', 'gogle');
    expect(fournisseursDisponibles()).toEqual([]);

    vi.stubEnv('VITE_FOURNISSEURS_APK', '  ');
    expect(fournisseursDisponibles()).toEqual([]);
  });

  it('ne change rien hors APK : le web propose toujours les deux', () => {
    vi.stubEnv('VITE_EDITION', 'web');
    vi.stubEnv('VITE_FOURNISSEURS_APK', '');
    expect([...fournisseursDisponibles()]).toEqual(['google', 'facebook']);
  });
});
