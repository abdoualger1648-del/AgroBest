import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { dossiersAutorises, peutCreerUnDossier } from '@/domain/access';
import { useCourse } from '@/store/course';
import { useNiveau } from '@/hooks/useAcces';

/**
 * Création d'un dossier supplémentaire.
 *
 * Le plafond est vérifié ici aussi, pas seulement sur l'écran précédent :
 * l'adresse est atteignable directement, et un verrou qui ne tient que dans
 * le bouton qui y mène n'est pas un verrou.
 */
export function NouveauDossierPage() {
  const { t } = useTranslation('dossiers');
  const navigate = useNavigate();
  const createProject = useCourse((state) => state.createProject);
  const projects = useCourse((state) => state.projects);
  const niveau = useNiveau();

  if (!peutCreerUnDossier(niveau, projects.length)) {
    return (
      <PageHeader
        title={t('plafondTitre')}
        description={t('plafondAtteint', { max: dossiersAutorises(niveau) })}
      />
    );
  }

  return (
    <>
      <PageHeader title={t('nouveauTitre')} description={t('nouveauSousTitre')} />
      <ProjectForm
        submitLabel={t('nouveauValider')}
        onSubmit={async (input) => {
          await createProject(input);
          await navigate('/jour/1');
        }}
      />
    </>
  );
}
