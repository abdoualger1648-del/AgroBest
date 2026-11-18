import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { LECONS_OFFERTES, type MotifBlocage } from '@/domain/access';

interface BlocageAccesProps {
  motif: MotifBlocage;
  jour?: number;
}

const DESTINATIONS: Record<MotifBlocage, string> = {
  compte_requis: '/compte',
  email_a_confirmer: '/compte/confirmation',
  activation_requise: '/compte/activation',
};

const ACTIONS: Record<MotifBlocage, string> = {
  compte_requis: 'actions.creerCompte',
  email_a_confirmer: 'actions.jaiConfirme',
  activation_requise: 'actions.demander',
};

/**
 * Écran affiché à la place d'une leçon dont l'accès est fermé. Il dit toujours
 * ce qui bloque ET ce qu'il faut faire : un verrou sans issue visible est le
 * meilleur moyen de perdre quelqu'un.
 */
export function BlocageAcces({ motif, jour }: BlocageAccesProps) {
  const { t } = useTranslation('compte');

  const titres: Record<MotifBlocage, string> = {
    compte_requis: t('blocage.compteRequisTitre'),
    email_a_confirmer: t('blocage.emailAConfirmerTitre'),
    activation_requise: t('blocage.activationRequiseTitre', { jour: jour ?? 0 }),
  };
  const textes: Record<MotifBlocage, string> = {
    compte_requis: t('blocage.compteRequisTexte'),
    email_a_confirmer: t('blocage.emailAConfirmerTexte'),
    activation_requise: t('blocage.activationRequiseTexte', { total: LECONS_OFFERTES }),
  };

  return (
    <>
      <PageHeader title={titres[motif]} description={textes[motif]} />
      <Link to={DESTINATIONS[motif]} className="block">
        <Button block>{t(ACTIONS[motif])}</Button>
      </Link>
    </>
  );
}
