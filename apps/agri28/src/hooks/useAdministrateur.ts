import { useEffect, useState } from 'react';
import { compteRequis } from '@/config';
import { estAdministrateur } from '@/compte/droits';

/**
 * Vrai quand le compte connecté administre. Faux tant que la réponse n'est pas
 * arrivée : un écran d'administration qui apparaît puis disparaît est pire
 * qu'un écran qui apparaît une seconde plus tard.
 */
export function useAdministrateur(): boolean {
  const [administrateur, setAdministrateur] = useState(false);

  useEffect(() => {
    if (!compteRequis()) return;
    let valide = true;
    void estAdministrateur().then((resultat) => {
      if (valide) setAdministrateur(resultat);
    });
    return () => {
      valide = false;
    };
  }, []);

  return administrateur;
}
