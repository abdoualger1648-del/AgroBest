import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { urlApk } from '@/config';

/**
 * Page de téléchargement de l'APK, affichée par la vitrine.
 *
 * Elle dit aussi ce qui attend l'utilisateur après l'installation : Android
 * demandera une autorisation, et l'activation sera nécessaire après les trois
 * premières leçons. Le découvrir au moment où ça bloque fait abandonner.
 */
export function TelechargerPage() {
  const { t } = useTranslation('vitrine');
  const lien = urlApk();

  return (
    <>
      <PageHeader title={t('page.titre')} description={t('page.sousTitre')} />

      {lien === '' ? (
        <p role="status" className="mb-6 font-medium text-muted">
          {t('page.sansLien')}
        </p>
      ) : (
        <a href={lien} className="mb-6 block" download>
          <Button block>{t('page.telecharger')}</Button>
        </a>
      )}

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">{t('page.pourquoiTitre')}</h2>
        <p className="text-sm text-muted">{t('page.pourquoiTexte')}</p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">{t('page.installationTitre')}</h2>
        <p className="text-sm text-muted">{t('page.installationTexte')}</p>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{t('page.activationTitre')}</h2>
        <p className="text-sm text-muted">{t('page.activationTexte')}</p>
      </Card>
    </>
  );
}
