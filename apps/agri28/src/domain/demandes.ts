import type { DemandeEnAttente } from '@/compte/port';

/**
 * Lecture des demandes en attente, côté administrateur (phase 11).
 * Fonctions pures : elles ne touchent ni au réseau, ni au stockage.
 */

export interface ResumeDemandes {
  total: number;
  activations: number;
  niveaux: number;
  /** Demandes arrivées depuis la dernière visite de l'écran. */
  nouvelles: number;
}

export function resumerDemandes(
  demandes: readonly DemandeEnAttente[],
  vuJusquA: number,
): ResumeDemandes {
  return {
    total: demandes.length,
    activations: demandes.filter((d) => d.nature === 'activation').length,
    niveaux: demandes.filter((d) => d.nature === 'niveau').length,
    nouvelles: demandes.filter((d) => d.demandeLe > vuJusquA).length,
  };
}

/**
 * Date de la demande la plus récente : c'est elle qu'on retient comme « vu »,
 * et non l'instant présent. Prendre l'horloge marquerait comme lues des
 * demandes écrites pendant que l'écran chargeait.
 */
export function plusRecente(demandes: readonly DemandeEnAttente[]): number {
  return demandes.reduce((maximum, demande) => Math.max(maximum, demande.demandeLe), 0);
}
