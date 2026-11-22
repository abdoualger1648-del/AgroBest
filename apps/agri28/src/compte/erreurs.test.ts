import { describe, expect, it } from 'vitest';
import { traduireErreurFirebase, traduireErreurNative } from './erreurs';
import { FOURNISSEURS, impasseFournisseur } from './port';

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

describe('impasse d’un compte créé chez un fournisseur', () => {
  it('se signale là où aucun bouton de fournisseur n’existe (APK)', () => {
    // Sans boutons, « identifiants incorrects » et « adresse déjà utilisée »
    // n'ont aucune suite visible : c'est là que la phrase d'aide sert.
    expect(impasseFournisseur('identifiants_invalides', [])).toBe(true);
    expect(impasseFournisseur('email_deja_utilise', [])).toBe(true);
  });

  it('se tait quand les boutons sont là : l’utilisateur n’a qu’à cliquer', () => {
    expect(impasseFournisseur('identifiants_invalides', FOURNISSEURS)).toBe(false);
    expect(impasseFournisseur('email_deja_utilise', FOURNISSEURS)).toBe(false);
    expect(impasseFournisseur('identifiants_invalides', ['google'])).toBe(false);
  });

  it('ne s’invite pas sur les erreurs qui n’ont rien à voir', () => {
    expect(impasseFournisseur('hors_ligne', [])).toBe(false);
    expect(impasseFournisseur('mot_de_passe_faible', [])).toBe(false);
    expect(impasseFournisseur('email_invalide', [])).toBe(false);
    expect(impasseFournisseur('trop_de_tentatives', [])).toBe(false);
    expect(impasseFournisseur('inconnue', [])).toBe(false);
  });
});

describe('erreurs du plugin natif (phase 16)', () => {
  it('traite toute annulation comme un geste délibéré, pas comme une panne', () => {
    // Le plugin ne donne pas de code : seul le message dit l'annulation, et
    // il n'est pas le même selon le fournisseur ni selon l'API Android.
    expect(traduireErreurNative(new Error('Sign in canceled.'))).toBe('connexion_annulee');
    expect(traduireErreurNative(new Error('Authorization canceled.'))).toBe('connexion_annulee');
    expect(traduireErreurNative(new Error('activity is cancelled by the user.'))).toBe(
      'connexion_annulee',
    );
    // Orthographe britannique comprise : « cancelled » contient « cancel ».
    expect(traduireErreurNative(new Error('Sign in cancelled'))).toBe('connexion_annulee');
  });

  it('distingue « aucun compte sur ce téléphone » d’une panne du fournisseur', () => {
    // Android Credential Manager, quand le téléphone n'a pas de compte
    // Google : NoCredentialException, sans code, « No credentials available ».
    // Avant cette règle l'écran disait « quelque chose n'a pas fonctionné »,
    // alors que l'action utile tient en une phrase.
    expect(traduireErreurNative(new Error('No credentials available'))).toBe(
      'aucun_compte_appareil',
    );
    expect(traduireErreurNative(new Error('androidx.credentials: No credential found'))).toBe(
      'aucun_compte_appareil',
    );
  });

  it('traite l’absence des services Google Play comme un fournisseur indisponible', () => {
    // Là, rien à faire côté utilisateur : l'email et le mot de passe restent
    // la voie, et c'est ce que dit déjà ce message.
    expect(
      traduireErreurNative(new Error('Provider configuration error: no provider dependency')),
    ).toBe('fournisseur_indisponible');
    expect(traduireErreurNative(new Error('Unsupported credential type'))).toBe(
      'fournisseur_indisponible',
    );
  });

  it('nomme une configuration absente au lieu de dire « inconnue »', () => {
    // Exactement ce qui arrive si google-services.json manque dans l'APK.
    expect(
      traduireErreurNative(new Error('Default FirebaseApp is not initialized in this process')),
    ).toBe('fournisseur_indisponible');
    expect(
      traduireErreurNative(new Error('No browser is available to complete the sign-in flow.')),
    ).toBe('fournisseur_indisponible');
  });

  it('laisse la priorité au vrai code quand le plugin en fournit un', () => {
    const avecCode = Object.assign(new Error('peu importe'), {
      code: 'auth/account-exists-with-different-credential',
    });
    expect(traduireErreurNative(avecCode)).toBe('autre_methode');
  });

  it('reconnaît une coupure réseau', () => {
    expect(traduireErreurNative(new Error('A network error has occurred'))).toBe('hors_ligne');
  });

  it('ne suppose jamais la forme de ce qu’on lui donne', () => {
    expect(traduireErreurNative(null)).toBe('inconnue');
    expect(traduireErreurNative(undefined)).toBe('inconnue');
    expect(traduireErreurNative({ message: 42 })).toBe('inconnue');
    expect(traduireErreurNative(new Error('boum'))).toBe('inconnue');
    expect(traduireErreurNative('Sign in canceled.')).toBe('connexion_annulee');
  });
});
