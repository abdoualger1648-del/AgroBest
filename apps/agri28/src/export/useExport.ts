import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { formatDate } from '@/lib/format';
import { projectTypeLabel, scaleLabel } from '@/domain/prompt';
import { wilayaName } from '@/content/catalog';
import {
  buildDossierDocument,
  buildDossierWorkbook,
  buildNotebookDocument,
  type DossierLabels,
} from './model';
import { downloadBlob, safeFilename } from './download';

export type ExportState = 'idle' | 'working' | 'error';

/**
 * Les bibliothèques d'export sont chargées à la demande, au clic : elles
 * n'entrent jamais dans le paquet initial (décision D18).
 */
export function useDossierExport() {
  const { t } = useTranslation('dossier');
  const lang = usePreferences((state) => state.lang);
  const project = useCourse((state) => state.project);
  const items = useCourse((state) => state.dossier);
  const [state, setState] = useState<ExportState>('idle');

  const buildSpec = useCallback(() => {
    if (!project) return null;
    const labels: DossierLabels = {
      documentTitle: t('export.documentTitle'),
      kinds: {
        fiche_projet: t('kinds.fiche_projet'),
        objectifs: t('kinds.objectifs'),
        budget: t('kinds.budget'),
        calendrier: t('kinds.calendrier'),
        risques: t('kinds.risques'),
        equipe: t('kinds.equipe'),
        achats: t('kinds.achats'),
        suivi: t('kinds.suivi'),
        rapport: t('kinds.rapport'),
        libre: t('kinds.libre'),
      },
      day: (day) => t('fromDay', { day }),
      generatedOn: (date) => t('export.generatedOn', { date }),
      project: {
        name: t('project.name'),
        type: t('project.type'),
        scale: t('project.scale'),
        wilaya: t('project.wilaya'),
        objective: t('project.objective'),
      },
      workbook: {
        summarySheet: t('export.summarySheet'),
        section: t('export.columns.section'),
        day: t('export.columns.day'),
        type: t('export.columns.type'),
        content: t('export.columns.content'),
      },
    };

    const spec = buildDossierDocument({
      project,
      items,
      lang,
      labels,
      projectValues: {
        type: projectTypeLabel(project, lang),
        scale: scaleLabel(project, lang),
        wilaya: wilayaName(project.wilayaCode, lang) ?? project.wilayaCode,
      },
      generatedOn: formatDate(new Date(), lang),
    });

    return { spec, labels };
  }, [items, lang, project, t]);

  const run = useCallback(
    async (kind: 'docx' | 'xlsx') => {
      const built = buildSpec();
      if (!built || !project) return;
      setState('working');
      try {
        if (kind === 'docx') {
          const { buildDocxBlob } = await import('./docx');
          downloadBlob(await buildDocxBlob(built.spec), safeFilename(project.name, 'docx'));
        } else {
          const { buildXlsxBlob } = await import('./xlsx');
          const workbook = buildDossierWorkbook(built.spec, built.labels);
          downloadBlob(await buildXlsxBlob(workbook), safeFilename(project.name, 'xlsx'));
        }
        setState('idle');
      } catch {
        setState('error');
      }
    },
    [buildSpec, project],
  );

  return {
    state,
    canExport: project !== null,
    exportDocx: () => run('docx'),
    exportXlsx: () => run('xlsx'),
  };
}

export function useNotebookExport() {
  const { t } = useTranslation('notebook');
  const lang = usePreferences((state) => state.lang);
  const project = useCourse((state) => state.project);
  const prompts = useCourse((state) => state.prompts);
  const [state, setState] = useState<ExportState>('idle');

  const exportDocx = useCallback(async () => {
    if (!project || prompts.length === 0) return;
    setState('working');
    try {
      const spec = buildNotebookDocument(
        prompts,
        lang,
        {
          documentTitle: t('export.documentTitle'),
          day: (day) => t('fromDay', { day }),
          tool: t('tool'),
          note: t('export.note'),
          generatedOn: (date) => t('export.generatedOn', { date }),
        },
        formatDate(new Date(), lang),
        project.name,
      );
      const { buildDocxBlob } = await import('./docx');
      downloadBlob(
        await buildDocxBlob(spec),
        safeFilename(`${t('export.documentTitle')} ${project.name}`, 'docx'),
      );
      setState('idle');
    } catch {
      setState('error');
    }
  }, [lang, project, prompts, t]);

  return { state, exportDocx, canExport: prompts.length > 0 };
}
