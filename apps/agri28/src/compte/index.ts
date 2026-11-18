import { FauxServiceCompte } from './faux';
import type { ServiceCompte } from './port';

/**
 * Service de comptes utilisé par l'application.
 *
 * Phase 8a : l'implémentation en mémoire. Elle rend les écrans et la logique
 * d'accès entièrement éprouvables sans dépendre d'un service réel, et sans
 * qu'aucune donnée ne sorte de l'appareil tant que Firebase n'est pas branché.
 * La phase 8b remplacera cette seule ligne.
 */
const instance = new FauxServiceCompte();

export const serviceCompte: ServiceCompte = instance;

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
