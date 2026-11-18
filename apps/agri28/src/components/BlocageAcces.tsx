import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { LECONS_OFFERTES, type MotifBlocage } from '@/domain/access';
import { LECONS_VITRINE } from '@/config';

interface BlocageAccesProps {
  motif: MotifBlocage;
  jour?: number;
}

const DESTINATIONS: Record<MotifBlocage, string> = {
  compte_requis: '/compte',
  email_a_confirmer: '/compte/confirmation',
  activation_requise: '/compte/activation',
  application_requise: '/telecharger',
};

/**
 * Écran affiché à la place d'une leçon dont l'accès est fermé. Il dit toujours
 * ce qui bloque ET ce qu'il faut faire : un verrou sans issue visible est le
 * meilleur moyen de perdre quelqu'un.
 */
export function BlocageAcces({ motif, jour }: BlocageAccesProps) {
  const { t } = useTranslation(['compte', 'vitrine']);

  const titres: Record<MotifBlocage, string> = {
    compte_requis: t('compte:blocage.compteRequisTitre'),
    email_a_confirmer: t('compte:blocage.emailAConfirmerTitre'),
    activation_requise: t('compte:blocage.activationRequiseTitre', { jour: jour ?? 0 }),
    application_requise: t('vitrine:blocage.titre', { jour: jour ?? 0 }),
  };
  const textes: Record<MotifBlocage, string> = {
    compte_requis: t('compte:blocage.compteRequisTexte'),
    email_a_confirmer: t('compte:blocage.emailAConfirmerTexte'),
    activation_requise: t('compte:blocage.activationRequiseTexte', { total: LECONS_OFFERTES }),
    application_requise: t('vitrine:blocage.texte', { total: LECONS_VITRINE }),
  };
  const actions: Record<MotifBlocage, string> = {
    compte_requis: t('compte:actions.creerCompte'),
    email_a_confirmer: t('compte:actions.jaiConfirme'),
    activation_requise: t('compte:actions.demander'),
    application_requise: t('vitrine:page.telecharger'),
  };

  return (
    <>
      <PageHeader title={titres[motif]} description={textes[motif]} />
      <Link to={DESTINATIONS[motif]} className="block">
        <Button block>{actions[motif]}</Button>
      </Link>
    </>
  );
}
