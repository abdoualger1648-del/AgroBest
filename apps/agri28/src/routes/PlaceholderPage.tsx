import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

type ScreenKey = 'onboarding' | 'project' | 'day' | 'dossier' | 'notebook' | 'templates' | 'badges';

interface PlaceholderPageProps {
  screen: ScreenKey;
}

/**
 * Écrans de la phase 1 : titre, promesse, phase de réalisation.
 * Chacun sera remplacé par son écran réel aux phases 2, 3 et 5.
 */
export function PlaceholderPage({ screen }: PlaceholderPageProps) {
  const { t } = useTranslation('screens');
  return (
    <>
      <PageHeader title={t(`${screen}.title`)} description={t(`${screen}.description`)} />
      <ComingSoon phase={t(`${screen}.phase`)} />
    </>
  );
}
