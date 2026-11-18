import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';

/**
 * Attente de la confirmation de l'adresse email.
 *
 * Rien n'est automatique : c'est l'utilisateur qui dit « j'ai confirmé », et
 * l'application relit alors l'état. Guetter en boucle consommerait des données
 * et de la batterie pour un évènement qui peut arriver une heure plus tard.
 */
export function ConfirmationPage() {
  const { t } = useTranslation('compte');
  const navigate = useNavigate();
  const etat = useEtatCompte();

  const rafraichir = useCompte((state) => state.rafraichir);
  const renvoyerVerification = useCompte((state) => state.renvoyerVerification);
  const enCours = useCompte((state) => state.enCours);
  const derniereErreur = useCompte((state) => state.derniereErreur);

  const [renvoye, setRenvoye] = useState(false);
  const [toujoursPas, setToujoursPas] = useState(false);

  // L'adresse est confirmée : il n'y a plus rien à attendre ici.
  if (etat.statut !== 'non_verifie' && etat.statut !== 'anonyme') {
    return (
      <>
        <PageHeader
          title={t('titre')}
          description={t('etat.connecteComme', { email: etat.email })}
        />
        <Button block onClick={() => void navigate('/')}>
          {t('actions.retour')}
        </Button>
      </>
    );
  }

  async function verifier() {
    setToujoursPas(false);
    setRenvoye(false);
    await rafraichir();
    // `etat` n'est pas encore à jour dans ce rendu : on relit le store.
    if (useCompte.getState().etat.statut === 'non_verifie') setToujoursPas(true);
  }

  async function renvoyer() {
    setToujoursPas(false);
    if (await renvoyerVerification()) setRenvoye(true);
  }

  const email = etat.statut === 'non_verifie' ? etat.email : '';

  return (
    <>
      <PageHeader
        title={t('confirmation.titre')}
        description={t('confirmation.texte', { email })}
      />

      <Card className="mb-4 bg-surface-2">
        <p className="text-sm text-muted">{t('confirmation.aide')}</p>
      </Card>

      {renvoye ? (
        <p role="status" className="mb-3 text-sm font-medium text-primary">
          {t('confirmation.renvoye')}
        </p>
      ) : null}
      {toujoursPas ? (
        <p role="status" className="mb-3 text-sm font-medium text-warning">
          {t('confirmation.toujoursPas')}
        </p>
      ) : null}
      {derniereErreur ? (
        <p role="alert" className="mb-3 text-sm font-medium text-danger">
          {t(`erreurs.${derniereErreur}`)}
        </p>
      ) : null}

      <Button block disabled={enCours} onClick={() => void verifier()}>
        {t('actions.jaiConfirme')}
      </Button>
      <Button
        block
        variant="secondary"
        className="mt-3"
        disabled={enCours}
        onClick={() => void renvoyer()}
      >
        {t('actions.renvoyer')}
      </Button>
    </>
  );
}
