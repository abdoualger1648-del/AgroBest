import type { EtatCompte, Niveau } from '@/domain/access';
import { FOURNISSEURS, type Fournisseur } from '@/compte/port';

/**
 * Édition de l'application. Un même code source, trois distributions :
 *
 * - `complete` : développement et tests. Aucun compte, aucun plafond.
 * - `apk`      : l'application partagée en APK. Compte obligatoire, essai sur
 *                les trois premières leçons, puis activation (D46, D47).
 * - `web`      : le site public. Même produit que l'APK — compte, essai de
 *                trois leçons, activation — servi depuis un navigateur, pour
 *                qui n'a pas de téléphone Android.
 *
 * Choisie au build par `VITE_EDITION`, jamais devinée à l'exécution : une
 * édition qui changerait selon l'appareil serait impossible à tester.
 */
export type Edition = 'complete' | 'apk' | 'web';

const EDITIONS: readonly Edition[] = ['complete', 'apk', 'web'];

export function edition(): Edition {
  const valeur = import.meta.env.VITE_EDITION;
  return EDITIONS.includes(valeur as Edition) ? (valeur as Edition) : 'complete';
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
  const courante = edition();
  return courante === 'apk' || courante === 'web';
}

/** Faut-il proposer l'APK ? Inutile quand on EST déjà dans l'APK. */
export function proposeApk(): boolean {
  return edition() !== 'apk';
}

/**
 * Adresse à laquelle l'utilisateur envoie sa demande d'activation (D49).
 * Vide tant qu'elle n'est pas fournie au build : l'écran de demande le
 * signale plutôt que d'ouvrir un email sans destinataire.
 */
/**
 * Fournisseurs d'identité proposés par cette édition (phase 14).
 *
 * **Vides dans l'APK, et c'est délibéré.** Google refuse l'OAuth depuis une
 * WebView embarquée — c'est exactement ce qu'est un APK Capacitor — et la
 * tentative échoue sur un « disallowed_useragent » que l'utilisateur ne peut
 * pas comprendre. Les boutons n'y apparaissent donc pas tant que le chemin
 * natif n'existe pas. Mieux vaut pas de bouton qu'un bouton qui échoue.
 */
export function fournisseursDisponibles(): readonly Fournisseur[] {
  return edition() === 'apk' ? [] : FOURNISSEURS;
}

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

/** Même raison : sans compte, aucun plafond de dossiers ne s'applique. */
export const NIVEAU_IMPLICITE: Niveau = 'multi';
