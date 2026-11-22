import { useEffect, useState } from 'react';
import { compteRequis } from '@/config';
import { estAdministrateur } from '@/compte/droits';
import { useCompte } from '@/store/compte';

/**
 * Vrai quand le compte connecté administre. Faux tant que la réponse n'est pas
 * arrivée : un écran d'administration qui apparaît puis disparaît est pire
 * qu'un écran qui apparaît une seconde plus tard.
 *
 * La question est reposée à chaque changement de compte. Sans cela, un hook
 * monté une fois pour toute la vie de l'application — c'est le cas dans
 * `App.tsx` — gardait sa première réponse : quelqu'un qui se connecte APRÈS
 * le démarrage n'était jamais reconnu comme administrateur, et celui qui se
 * déconnectait le restait.
 *
 * La réponse est retenue AVEC l'identifiant auquel elle se rapporte, et la
 * valeur rendue est dérivée. Remettre l'état à faux depuis l'effet, à chaque
 * changement de compte, provoquerait une cascade de rendus — et le rendrait
 * faux une fraction de seconde même quand rien n'a changé.
 */
export function useAdministrateur(): boolean {
  const uid = useCompte((state) => state.uid);
  const [reponse, setReponse] = useState<{ uid: string | null; droits: boolean }>({
    uid: null,
    droits: false,
  });

  useEffect(() => {
    if (!compteRequis() || uid === null) return;
    let valide = true;
    void estAdministrateur().then((droits) => {
      if (valide) setReponse({ uid, droits });
    });
    return () => {
      valide = false;
    };
  }, [uid]);

  // Une réponse qui concerne un autre compte ne vaut rien.
  return reponse.uid === uid && reponse.droits;
}
