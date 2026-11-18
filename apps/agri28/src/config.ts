import type { EtatCompte } from '@/domain/access';

/**
 * Édition de l'application. Un même code source, trois distributions :
 *
 * - `complete` : développement et tests. Aucun compte, aucun plafond.
 * - `apk`      : l'application partagée en APK. Compte obligatoire, essai sur
 *                les trois premières leçons, puis activation (D46, D47).
 * - `vitrine`  : le site public, limité aux trois premières leçons, sans
 *                compte. Les leçons suivantes n'y sont pas seulement
 *                masquées : elles ne sont pas construites.
 *
 * Choisie au build par `VITE_EDITION`, jamais devinée à l'exécution : une
 * édition qui changerait selon l'appareil serait impossible à tester.
 */
export type Edition = 'complete' | 'apk' | 'vitrine';

const EDITIONS: readonly Edition[] = ['complete', 'apk', 'vitrine'];

export function edition(): Edition {
  const valeur = import.meta.env.VITE_EDITION;
  return EDITIONS.includes(valeur as Edition) ? (valeur as Edition) : 'complete';
}

/** Nombre de leçons offertes par la vitrine ; `null` quand il n'y a pas de plafond. */
export const LECONS_VITRINE = 3;

export function plafondLecons(): number | null {
  return edition() === 'vitrine' ? LECONS_VITRINE : null;
}

/**
 * Adresse où télécharger l'APK, donnée au build. Vide tant qu'aucune version
 * n'est publiée : l'écran le dit, au lieu de proposer un lien mort.
 */
export function urlApk(): string {
  return import.meta.env.VITE_URL_APK ?? '';
}

/** L'édition exige-t-elle un compte et une activation ? */
export function compteRequis(): boolean {
  return edition() === 'apk';
}

/**
 * Adresse à laquelle l'utilisateur envoie sa demande d'activation (D49).
 * Vide tant qu'elle n'est pas fournie au build : l'écran de demande le
 * signale plutôt que d'ouvrir un email sans destinataire.
 */
export function emailAdmin(): string {
  return import.meta.env.VITE_EMAIL_ADMIN ?? '';
}

/**
 * État de compte à utiliser hors édition `apk`. Plutôt que de parsemer
 * l'interface de « si le compte est requis… », les éditions sans compte
 * répondent « actif » : il n'existe alors qu'un seul chemin de code.
 */
export const COMPTE_IMPLICITE: EtatCompte = {
  statut: 'actif',
  email: '',
  activeLe: 0,
};
