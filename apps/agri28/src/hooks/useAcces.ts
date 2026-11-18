import { useMemo } from 'react';
import {
  accesAuJour,
  accesVitrine,
  dernierJourAccessible,
  type Acces,
  type EtatCompte,
} from '@/domain/access';
import { COMPTE_IMPLICITE, compteRequis, plafondLecons } from '@/config';
import { useCompte } from '@/store/compte';

/**
 * État de compte tel que l'interface doit le voir.
 *
 * Hors édition APK, il n'y a pas de compte : on renvoie un état « actif »
 * plutôt que de disperser des « si le compte est requis… » dans les écrans.
 * Un seul chemin de code, donc un seul comportement à éprouver.
 */
export function useEtatCompte(): EtatCompte {
  const reel = useCompte((state) => state.etat);
  return compteRequis() ? reel : COMPTE_IMPLICITE;
}

/** Droit d'ouvrir une leçon, pour l'édition en cours. */
export function useAccesJour(jour: number): Acces {
  const etat = useEtatCompte();
  const plafond = plafondLecons();
  return useMemo(
    () => (plafond === null ? accesAuJour(jour, etat) : accesVitrine(jour, plafond)),
    [jour, etat, plafond],
  );
}

/** Dernière leçon ouverte, pour l'édition en cours. */
export function useDernierJourAccessible(): number {
  const etat = useEtatCompte();
  const plafond = plafondLecons();
  return useMemo(() => (plafond === null ? dernierJourAccessible(etat) : plafond), [etat, plafond]);
}
