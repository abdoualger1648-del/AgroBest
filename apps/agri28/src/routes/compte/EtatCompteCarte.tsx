import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CopyButton } from '@/components/CopyButton';
import { PageHeader } from '@/components/PageHeader';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';

/** Résumé du compte, affiché à la place du formulaire une fois connecté. */
export function EtatCompteCarte() {
  const { t } = useTranslation('compte');
  const etat = useEtatCompte();
  const uid = useCompte((state) => state.uid);
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

      {/* L'identifiant du compte est ce qui désigne un administrateur
          (D56). Sans cet affichage, il fallait aller le chercher dans la
          console Firebase ; on le lit maintenant depuis le téléphone. */}
      {uid ? (
        <Card className="mt-4 bg-surface-2">
          <p className="font-semibold">{t('etat.identifiant')}</p>
          <p className="mt-1 font-mono text-sm break-all">{uid}</p>
          <p className="mt-2 text-sm text-muted">{t('etat.identifiantAide')}</p>
          <div className="mt-3">
            <CopyButton text={uid} label={t('etat.copier')} copiedLabel={t('etat.copie')} />
          </div>
        </Card>
      ) : null}

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
