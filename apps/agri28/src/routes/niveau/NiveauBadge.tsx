import { useTranslation } from 'react-i18next';
import type { NiveauParcours } from '@/domain/niveau';

/**
 * Pastille de niveau.
 *
 * Le texte est en `fg` sur `surface-2` — une paire dont le contraste est déjà
 * mesuré par `src/styles/tokens.test.ts`. La couleur ne sert qu'au liseré, et
 * elle ne porte aucune information : le nom du niveau est toujours écrit.
 */
const LISERES: Record<NiveauParcours, string> = {
  debutant: 'border-s-primary',
  intermediaire: 'border-s-success',
  avance: 'border-s-accent',
};

export function NiveauBadge({
  niveau,
  className = '',
}: {
  niveau: NiveauParcours;
  className?: string;
}) {
  const { t } = useTranslation('niveau');
  return (
    <span
      className={`inline-flex items-center rounded-e-lg border-s-4 bg-surface-2 px-3 py-1 text-sm font-semibold text-fg ${LISERES[niveau]} ${className}`}
    >
      {t(`niveaux.${niveau}.nom`)}
    </span>
  );
}
