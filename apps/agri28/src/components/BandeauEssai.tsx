import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { ChevronEndIcon } from '@/components/Icon';
import { LECONS_OFFERTES, leconsRestantes } from '@/domain/access';
import { useEtatCompte } from '@/hooks/useAcces';
import { useCourse } from '@/store/course';

/**
 * Prévient pendant l'essai, avant le mur et non au moment de le heurter.
 * N'apparaît que si la question se pose : rien pour un compte activé, rien
 * dans les éditions sans compte.
 */
export function BandeauEssai() {
  const { t } = useTranslation('compte');
  const etat = useEtatCompte();
  const progress = useCourse((state) => state.progress);

  const joursValides = progress.filter((entree) => entree.status === 'done').length;
  const restantes = leconsRestantes(etat, joursValides);
  if (restantes === null) return null;

  return (
    <Link to="/compte/activation" className="block">
      <Card className="mb-4 border-primary/40 bg-surface-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{t('essai.titre')}</p>
            <p className="mt-1 text-sm text-muted">
              {restantes === 0
                ? t('essai.epuise')
                : t('essai.restantes', { n: restantes, total: LECONS_OFFERTES })}
            </p>
          </div>
          <ChevronEndIcon className="mirror shrink-0 text-muted" />
        </div>
      </Card>
    </Link>
  );
}
