/**
 * Validation des identifiants, côté application.
 *
 * Elle ne remplace pas celle du service distant — qui reste la seule autorité —
 * mais elle évite un aller-retour réseau pour une faute de frappe, ce qui
 * compte sur une connexion faible, et permet d'expliquer le problème dans la
 * langue de l'utilisateur au lieu d'afficher un code d'erreur anglais.
 */

/** Longueur minimale imposée par Firebase Authentication. */
export const LONGUEUR_MOT_DE_PASSE_MIN = 6;

export type ProblemeEmail = 'vide' | 'format';
export type ProblemeMotDePasse = 'vide' | 'trop_court';

/**
 * Contrôle volontairement permissif : une partie locale, un arobase, un
 * domaine avec un point, et aucun espace. Vouloir valider finement une adresse
 * par expression régulière est une erreur classique — seul l'envoi d'un email
 * prouve qu'une adresse existe, et c'est précisément ce que fait la suite.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validerEmail(saisie: string): ProblemeEmail | null {
  const email = saisie.trim();
  if (email.length === 0) return 'vide';
  return EMAIL.test(email) ? null : 'format';
}

export function validerMotDePasse(motDePasse: string): ProblemeMotDePasse | null {
  if (motDePasse.length === 0) return 'vide';
  return motDePasse.length < LONGUEUR_MOT_DE_PASSE_MIN ? 'trop_court' : null;
}

/** Normalise une adresse avant envoi : espaces retirés, casse abaissée. */
export function normaliserEmail(saisie: string): string {
  return saisie.trim().toLowerCase();
}
