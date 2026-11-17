import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { SeedlingIcon } from './Icon';

interface ComingSoonProps {
  /** Phase du plan où cet écran sera construit, par ex. « Phase 2 ». */
  phase?: string;
  /** Précision affichée à la place du texte générique. */
  note?: string;
}

/** Écran encore vide : on dit clairement ce qui viendra et quand. */
export function ComingSoon({ phase, note }: ComingSoonProps) {
  const { t } = useTranslation('common');
  return (
    <Card className="flex items-start gap-3">
      <SeedlingIcon className="mt-0.5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">
          {t('status.comingSoon')}
          {phase ? ` · ${phase}` : ''}
        </p>
        <p className="mt-1 text-sm text-muted">{note ?? t('status.inPreparation')}</p>
      </div>
    </Card>
  );
}
