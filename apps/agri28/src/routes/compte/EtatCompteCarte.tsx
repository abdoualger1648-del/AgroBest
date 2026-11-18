import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';

/** Résumé du compte, affiché à la place du formulaire une fois connecté. */
export function EtatCompteCarte() {
  const { t } = useTranslation('compte');
  const etat = useEtatCompte();
  const seDeconnecter = useCompte((state) => state.seDeconnecter);
  const enCours = useCompte((state) => state.enCours);

  if (etat.statut === 'anonyme') return null;

  return (
    <>
      <PageHeader title={t('titre')} />
      <Card>
        <p className="font-semibold">{t('etat.connecteComme', { email: etat.email })}</p>
        <p className="mt-1 text-sm text-muted">
          {etat.statut === 'actif' ? t('etat.actif') : t('etat.essai')}
        </p>
      </Card>

      {etat.statut === 'non_verifie' ? (
        <Link to="/compte/confirmation" className="mt-4 block">
          <Button block>{t('actions.jaiConfirme')}</Button>
        </Link>
      ) : null}

      {etat.statut === 'essai' || etat.statut === 'demande_envoyee' ? (
        <Link to="/compte/activation" className="mt-4 block">
          <Button block>{t('actions.demander')}</Button>
        </Link>
      ) : null}

      <Button
        block
        variant="secondary"
        className="mt-4"
        disabled={enCours}
        onClick={() => void seDeconnecter()}
      >
        {t('actions.seDeconnecter')}
      </Button>
    </>
  );
}
