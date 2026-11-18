import { Navigate, Outlet } from 'react-router';
import { compteRequis } from '@/config';
import { useCompte } from '@/store/compte';

/**
 * Renvoie vers la création de compte tant qu'il n'y en a aucun, dans les
 * éditions qui en exigent un.
 *
 * Deux précautions : on attend que le cache local soit lu (sinon l'écran
 * clignoterait vers « créez un compte » à chaque démarrage, y compris pour
 * quelqu'un d'activé), et on ne barre que l'absence totale de compte — un
 * email non confirmé ou une activation manquante sont expliqués au bon endroit
 * par `BlocageAcces`, pas par une redirection brutale.
 */
export function GardeCompte() {
  const charge = useCompte((state) => state.charge);
  const statut = useCompte((state) => state.etat.statut);

  if (!compteRequis()) return <Outlet />;
  if (!charge) return null;
  if (statut === 'anonyme') return <Navigate to="/compte" replace />;
  return <Outlet />;
}
