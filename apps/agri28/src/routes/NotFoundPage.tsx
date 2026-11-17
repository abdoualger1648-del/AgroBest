import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';

export function NotFoundPage() {
  const { t } = useTranslation('screens');
  return (
    <>
      <PageHeader title={t('notFound.title')} description={t('notFound.description')} />
      <Link to="/" className="font-semibold text-primary underline">
        {t('notFound.backHome')}
      </Link>
    </>
  );
}
