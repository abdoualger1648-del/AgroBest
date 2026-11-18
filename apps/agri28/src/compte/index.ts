import { FauxServiceCompte } from './faux';
import { ServiceFirebase } from './firebase';
import { compteRequis } from '@/config';
import type { ServiceCompte } from './port';

/**
 * Service de comptes utilisé par l'application, choisi au chargement du module
 * d'après l'édition du build.
 *
 * - Édition `apk` : Firebase (le SDK lui-même n'est chargé qu'à la première
 *   action réseau, jamais au démarrage).
 * - Partout ailleurs, développement et tests compris : l'implémentation en
 *   mémoire. Aucun test ne peut donc atteindre le vrai projet Firebase, et
 *   aucune donnée ne sort de l'appareil hors APK.
 */
const enMemoire = new FauxServiceCompte();

export const serviceCompte: ServiceCompte = compteRequis() ? new ServiceFirebase() : enMemoire;

/**
 * Donne accès aux leviers du service en mémoire (confirmer un email, activer
 * un compte) quand c'est lui qui est en place. Renvoie `null` dès qu'un vrai
 * service le remplace, pour qu'un test écrit contre la simulation échoue
 * franchement au lieu de passer en silence.
 */
export function serviceEnMemoire(): FauxServiceCompte | null {
  return serviceCompte instanceof FauxServiceCompte ? serviceCompte : null;
}

export type { ServiceCompte } from './port';
