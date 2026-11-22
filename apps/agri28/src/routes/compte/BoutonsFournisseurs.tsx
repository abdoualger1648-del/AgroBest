import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { fournisseursDisponibles } from '@/config';
import { estAnnulation, estErreurFournisseur, type Fournisseur } from '@/compte/port';
import { useCompte } from '@/store/compte';

/**
 * Connexion par Google ou Facebook (phase 14).
 *
 * N'affiche rien quand l'édition ne propose aucun fournisseur — c'est le cas
 * de l'APK, où Google refuse l'OAuth depuis une WebView embarquée. Mieux vaut
 * pas de bouton qu'un bouton qui échoue sur un message incompréhensible.
 *
 * Une annulation ne produit aucun message : fermer la fenêtre du fournisseur
 * est un geste délibéré, pas une panne.
 */
export function BoutonsFournisseurs() {
  const { t } = useTranslation('compte');
  const connecter = useCompte((state) => state.connecterAvecFournisseur);
  const enCours = useCompte((state) => state.enCours);
  const erreur = useCompte((state) => state.derniereErreur);

  const fournisseurs = fournisseursDisponibles();
  if (fournisseurs.length === 0) return null;

  const messageErreur =
    erreur && estErreurFournisseur(erreur) && !estAnnulation(erreur)
      ? t(`erreurs.${erreur}`)
      : null;

  return (
    <section aria-labelledby="fournisseurs-titre" className="mt-6">
      <div className="mb-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted">{t('fournisseurs.separateur')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <h2 id="fournisseurs-titre" className="mb-3 font-semibold">
        {t('fournisseurs.titre')}
      </h2>

      <div className="flex flex-col gap-2">
        {fournisseurs.map((fournisseur: Fournisseur) => (
          <Button
            key={fournisseur}
            block
            variant="secondary"
            disabled={enCours}
            onClick={() => void connecter(fournisseur)}
          >
            {t(`fournisseurs.${fournisseur}`)}
          </Button>
        ))}
      </div>

      {messageErreur ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {messageErreur}
        </p>
      ) : null}

      <p className="mt-3 text-sm text-muted">{t('fournisseurs.aide')}</p>
    </section>
  );
}
