import { Navigate, Outlet } from 'react-router';
import { usePreferences } from '@/store/preferences';

/**
 * Renvoie vers le test de niveau tant qu'il n'a pas été passé (phase 12).
 *
 * Même précaution que `GardeCompte` : on attend que le profil soit lu depuis
 * IndexedDB. Sans cela l'écran partirait vers le test à chaque démarrage, y
 * compris pour quelqu'un qui l'a déjà passé — `niveauParcours` valant `null`
 * dans l'état initial du store avant hydratation.
 *
 * Le test est placé APRÈS le contrôle de compte et AVANT le reste du parcours.
 * Cet ordre importe : il ne sert à rien de faire passer un test à quelqu'un
 * qui n'a pas encore de compte, et personne ne doit créer de dossier sans
 * niveau, sinon les variantes de niveau n'auraient aucune valeur à lire.
 *
 * Les réglages et le compte restent HORS de cette garde : quelqu'un doit
 * pouvoir changer de langue, lire ses mentions ou se déconnecter sans passer
 * le test d'abord.
 */
export function GardeNiveau() {
  const hydrated = usePreferences((state) => state.hydrated);
  const niveau = usePreferences((state) => state.niveauParcours);

  if (!hydrated) return null;
  if (niveau === null) return <Navigate to="/test-niveau" replace />;
  return <Outlet />;
}
