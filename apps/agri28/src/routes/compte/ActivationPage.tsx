import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { LECONS_OFFERTES } from '@/domain/access';
import { construireMailto } from '@/domain/mailto';
import { formatDate } from '@/lib/format';
import { emailAdmin } from '@/config';
import { usePreferences } from '@/store/preferences';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';

/**
 * Demande d'activation (D49). Deux gestes, volontairement séparés :
 * l'application enregistre la demande — c'est elle qui fait foi et qui
 * alimente l'écran d'administration — et propose en plus d'écrire à
 * l'administrateur, parce qu'un email arrive dans une poche, pas dans une
 * console.
 */
export function ActivationPage() {
  const { t } = useTranslation('compte');
  const lang = usePreferences((state) => state.lang);
  const etat = useEtatCompte();

  const uid = useCompte((state) => state.uid);
  const demanderActivation = useCompte((state) => state.demanderActivation);
  const rafraichir = useCompte((state) => state.rafraichir);
  const enCours = useCompte((state) => state.enCours);
  const derniereErreur = useCompte((state) => state.derniereErreur);

  const [toujoursPas, setToujoursPas] = useState(false);

  if (etat.statut === 'actif') {
    return (
      <PageHeader
        title={t('etat.actif')}
        description={t('etat.connecteComme', { email: etat.email })}
      />
    );
  }
  if (etat.statut === 'anonyme' || etat.statut === 'non_verifie') {
    return (
      <PageHeader
        title={t('blocage.compteRequisTitre')}
        description={t('blocage.compteRequisTexte')}
      />
    );
  }

  const adresse = emailAdmin();
  const lienMail = construireMailto({
    destinataire: adresse,
    sujet: t('activation.mailSujet'),
    corps: t('activation.mailCorps', { email: etat.email, uid: uid ?? '—' }),
  });

  const enAttente = etat.statut === 'demande_envoyee';

  async function verifier() {
    setToujoursPas(false);
    await rafraichir();
    if (useCompte.getState().etat.statut !== 'actif') setToujoursPas(true);
  }

  return (
    <>
      <PageHeader
        title={enAttente ? t('activation.enAttenteTitre') : t('activation.titre')}
        description={
          enAttente
            ? t('activation.enAttenteTexte')
            : t('activation.texte', { total: LECONS_OFFERTES })
        }
      />

      {enAttente ? (
        <Card className="mb-4 bg-surface-2">
          <p className="text-sm">
            {t('activation.envoyee', { date: formatDate(new Date(etat.demandeLe), lang) })}
          </p>
        </Card>
      ) : null}

      {derniereErreur ? (
        <p role="alert" className="mb-3 text-sm font-medium text-danger">
          {t(`erreurs.${derniereErreur}`)}
        </p>
      ) : null}
      {toujoursPas ? (
        <p role="status" className="mb-3 text-sm font-medium text-warning">
          {t('activation.enAttenteTexte')}
        </p>
      ) : null}

      {enAttente ? (
        <Button block disabled={enCours} onClick={() => void verifier()}>
          {t('actions.verifier')}
        </Button>
      ) : (
        <Button block disabled={enCours} onClick={() => void demanderActivation()}>
          {t('actions.demander')}
        </Button>
      )}

      {adresse === '' ? (
        <p className="mt-4 text-sm text-muted">{t('activation.sansAdresse')}</p>
      ) : (
        <a
          href={lienMail}
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-border px-5 py-3 font-semibold text-primary"
        >
          {t('activation.boutonEmail')}
        </a>
      )}
    </>
  );
}
