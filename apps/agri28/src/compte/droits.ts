import { serviceCompte } from './index';

/**
 * Droits d'administration du compte connecté, retenus pour la durée de la
 * session. Sans ce cache, l'affichage d'un simple lien de menu coûterait une
 * requête réseau à chaque visite — pour une réponse qui ne change jamais en
 * cours de session.
 *
 * Un échec vaut « non » : on ne montre pas un écran d'administration parce que
 * le réseau a hoqueté.
 */
let cache: Promise<boolean> | null = null;

export function estAdministrateur(): Promise<boolean> {
  cache ??= serviceCompte.estAdministrateur().catch(() => false);
  return cache;
}

/** À appeler à la déconnexion : les droits du compte suivant sont différents. */
export function oublierDroits(): void {
  cache = null;
}
