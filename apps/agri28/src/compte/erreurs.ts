import type { CodeErreurCompte } from './port';

/**
 * Traduit les codes d'erreur de Firebase en codes de l'application.
 *
 * Fonction pure et isolée pour deux raisons : elle est la seule partie du
 * branchement Firebase que l'on peut éprouver sans réseau ni projet réel, et
 * elle garantit qu'aucun code anglais de bibliothèque n'arrive jamais sous les
 * yeux d'un utilisateur.
 */
const TABLE: Record<string, CodeErreurCompte> = {
  // Authentification
  'auth/email-already-in-use': 'email_deja_utilise',
  'auth/invalid-email': 'email_invalide',
  'auth/weak-password': 'mot_de_passe_faible',
  'auth/missing-password': 'identifiants_invalides',
  'auth/user-not-found': 'identifiants_invalides',
  'auth/wrong-password': 'identifiants_invalides',
  'auth/invalid-credential': 'identifiants_invalides',
  'auth/invalid-login-credentials': 'identifiants_invalides',
  'auth/user-disabled': 'identifiants_invalides',
  'auth/network-request-failed': 'hors_ligne',
  'auth/too-many-requests': 'trop_de_tentatives',
  'auth/requires-recent-login': 'non_connecte',
  'auth/user-token-expired': 'non_connecte',
  'auth/null-user': 'non_connecte',

  // Fournisseurs d'identité (phase 14). Fermer la fenêtre, ou en ouvrir une
  // seconde, n'est pas une panne : l'écran doit se taire, pas alarmer.
  'auth/popup-closed-by-user': 'connexion_annulee',
  'auth/cancelled-popup-request': 'connexion_annulee',
  'auth/user-cancelled': 'connexion_annulee',
  'auth/popup-blocked': 'fournisseur_indisponible',
  'auth/operation-not-allowed': 'fournisseur_indisponible',
  'auth/operation-not-supported-in-this-environment': 'fournisseur_indisponible',
  'auth/unauthorized-domain': 'fournisseur_indisponible',
  'auth/account-exists-with-different-credential': 'autre_methode',
  'auth/credential-already-in-use': 'autre_methode',

  // Firestore
  unavailable: 'hors_ligne',
  'deadline-exceeded': 'hors_ligne',
  unauthenticated: 'non_connecte',
  'permission-denied': 'non_connecte',
  'resource-exhausted': 'trop_de_tentatives',
};

/** Lit le `code` d'une erreur Firebase sans jamais supposer sa forme. */
function codeBrut(erreur: unknown): string | null {
  if (typeof erreur !== 'object' || erreur === null) return null;
  const code: unknown = (erreur as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function traduireErreurFirebase(erreur: unknown): CodeErreurCompte {
  const brut = codeBrut(erreur);
  if (brut === null) return 'inconnue';
  return TABLE[brut] ?? 'inconnue';
}
