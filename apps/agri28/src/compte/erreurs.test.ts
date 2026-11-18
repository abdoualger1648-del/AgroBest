import { describe, expect, it } from 'vitest';
import { traduireErreurFirebase } from './erreurs';

/** Reproduit la forme d'une erreur Firebase : un objet portant un `code`. */
function erreurFirebase(code: string) {
  return Object.assign(new Error(code), { code });
}

describe('traduireErreurFirebase', () => {
  it('traduit les refus d’identifiants vers un seul message', () => {
    // Firebase distingue « adresse inconnue » et « mot de passe faux » ;
    // le dire à l'utilisateur révélerait quelles adresses ont un compte.
    for (const code of [
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/user-disabled',
    ]) {
      expect(traduireErreurFirebase(erreurFirebase(code))).toBe('identifiants_invalides');
    }
  });

  it('reconnaît une panne de réseau, côté authentification comme côté base', () => {
    expect(traduireErreurFirebase(erreurFirebase('auth/network-request-failed'))).toBe(
      'hors_ligne',
    );
    expect(traduireErreurFirebase(erreurFirebase('unavailable'))).toBe('hors_ligne');
    expect(traduireErreurFirebase(erreurFirebase('deadline-exceeded'))).toBe('hors_ligne');
  });

  it('distingue les cas où l’utilisateur peut agir', () => {
    expect(traduireErreurFirebase(erreurFirebase('auth/email-already-in-use'))).toBe(
      'email_deja_utilise',
    );
    expect(traduireErreurFirebase(erreurFirebase('auth/invalid-email'))).toBe('email_invalide');
    expect(traduireErreurFirebase(erreurFirebase('auth/weak-password'))).toBe(
      'mot_de_passe_faible',
    );
    expect(traduireErreurFirebase(erreurFirebase('auth/too-many-requests'))).toBe(
      'trop_de_tentatives',
    );
  });

  it('traite un refus de permission comme une session à refaire', () => {
    // Une règle de sécurité qui refuse signifie, côté utilisateur, que sa
    // session n'a pas les droits attendus : se reconnecter est l'action utile.
    expect(traduireErreurFirebase(erreurFirebase('permission-denied'))).toBe('non_connecte');
    expect(traduireErreurFirebase(erreurFirebase('unauthenticated'))).toBe('non_connecte');
  });

  it('ne suppose jamais la forme de ce qu’on lui donne', () => {
    expect(traduireErreurFirebase(new Error('boum'))).toBe('inconnue');
    expect(traduireErreurFirebase('auth/user-not-found')).toBe('inconnue');
    expect(traduireErreurFirebase(null)).toBe('inconnue');
    expect(traduireErreurFirebase(undefined)).toBe('inconnue');
    expect(traduireErreurFirebase({ code: 42 })).toBe('inconnue');
    expect(traduireErreurFirebase({ code: 'auth/jamais-vu' })).toBe('inconnue');
  });
});
