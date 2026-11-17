import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { useCourse } from '@/store/course';

export function OnboardingPage() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const createProject = useCourse((state) => state.createProject);

  return (
    <>
      <PageHeader title={t('create.title')} description={t('create.subtitle')} />
      <ProjectForm
        submitLabel={t('create.submit')}
        onSubmit={async (input) => {
          await createProject(input);
          await navigate('/jour/1');
        }}
      />
    </>
  );
}
