import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ProjectForm } from '@/components/ProjectForm';
import { wilayaName } from '@/content/catalog';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { projectTypeLabel, scaleLabel } from '@/domain/prompt';
import { formatDA } from '@/lib/format';

export function ProjectPage() {
  const { t } = useTranslation(['project', 'common']);
  const lang = usePreferences((state) => state.lang);
  const project = useCourse((state) => state.project);
  const updateProject = useCourse((state) => state.updateProject);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!project) {
    return (
      <>
        <PageHeader title={t('project:none.title')} description={t('project:none.description')} />
        <Link to="/bienvenue">
          <Button block>{t('project:none.cta')}</Button>
        </Link>
      </>
    );
  }

  if (editing) {
    return (
      <>
        <PageHeader title={t('project:edit.title')} />
        <ProjectForm
          initial={project}
          submitLabel={t('project:edit.submit')}
          onSubmit={async (input) => {
            await updateProject({
              name: input.name,
              type: input.type,
              ...(input.typeOther ? { typeOther: input.typeOther } : {}),
              scale: { value: input.scaleValue, unit: input.scaleUnit ?? project.scale.unit },
              wilayaCode: input.wilayaCode,
              ...(input.commune ? { commune: input.commune } : {}),
              objective: input.objective,
              horizonMonths: input.horizonMonths ?? project.horizonMonths,
              ...(input.budgetCeilingDA !== undefined
                ? { budgetCeilingDA: input.budgetCeilingDA }
                : {}),
              ...(input.waterSource ? { waterSource: input.waterSource } : {}),
            });
            setEditing(false);
            setSaved(true);
          }}
        />
      </>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: t('project:fields.type.label'), value: projectTypeLabel(project, lang) },
    { label: t('project:summary.scale'), value: scaleLabel(project, lang) },
    {
      label: t('project:summary.wilaya'),
      value: wilayaName(project.wilayaCode, lang) ?? project.wilayaCode,
    },
    { label: t('project:summary.objective'), value: project.objective },
    {
      label: t('project:summary.horizon'),
      value: `${String(project.horizonMonths)} ${lang === 'ar' ? 'شهرًا' : 'mois'}`,
    },
  ];

  if (project.commune) {
    rows.push({ label: t('project:fields.commune.label'), value: project.commune });
  }
  if (project.budgetCeilingDA !== undefined) {
    rows.push({
      label: t('project:summary.budget'),
      value: formatDA(project.budgetCeilingDA, lang),
    });
  }
  if (project.waterSource) {
    rows.push({
      label: t('project:summary.water'),
      value: t(`project:water.${project.waterSource}`),
    });
  }

  return (
    <>
      <PageHeader title={project.name} description={t('project:summary.title')} />

      {saved ? (
        <p role="status" className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
          {t('project:edit.saved')}
        </p>
      ) : null}

      <Card as="section" className="mb-4">
        <dl className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-4 py-2 first:pt-0 last:pb-0">
              <dt className="w-2/5 shrink-0 text-muted">{row.label}</dt>
              <dd className="flex-1 font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Button
        block
        variant="secondary"
        onClick={() => {
          setSaved(false);
          setEditing(true);
        }}
      >
        {t('project:summary.edit')}
      </Button>
    </>
  );
}
