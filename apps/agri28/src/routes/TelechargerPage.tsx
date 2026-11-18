import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { urlApk } from '@/config';

/**
 * Page de téléchargement de l'APK, proposée partout sauf dans l'APK.
 *
 * Elle dit aussi ce qui attend l'utilisateur après l'installation : Android
 * demandera une autorisation, et l'activation sera nécessaire après les trois
 * premières leçons. Le découvrir au moment où ça bloque fait abandonner.
 */
export function TelechargerPage() {
  const { t } = useTranslation('telechargement');
  const lien = urlApk();

  return (
    <>
      <PageHeader title={t('titre')} description={t('sousTitre')} />

      {lien === '' ? (
        <p role="status" className="mb-6 font-medium text-muted">
          {t('sansLien')}
        </p>
      ) : (
        <a href={lien} className="mb-6 block" download>
          <Button block>{t('telecharger')}</Button>
        </a>
      )}

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">{t('pourquoiTitre')}</h2>
        <p className="text-sm text-muted">{t('pourquoiTexte')}</p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">{t('installationTitre')}</h2>
        <p className="text-sm text-muted">{t('installationTexte')}</p>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{t('activationTitre')}</h2>
        <p className="text-sm text-muted">{t('activationTexte')}</p>
      </Card>
    </>
  );
}
