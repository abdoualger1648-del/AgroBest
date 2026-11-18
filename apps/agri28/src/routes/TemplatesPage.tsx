import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DossierBlocks } from '@/components/DossierBlocks';
import { listTemplates, templateBlocks } from '@/content/catalog';
import { usePreferences } from '@/store/preferences';
import { formatDate } from '@/lib/format';
import { buildDossierWorkbook, type DocumentSpec, type DossierLabels } from '@/export/model';
import { downloadBlob, safeFilename } from '@/export/download';
import type { TemplateDefinition } from '@/content/schema';

export function TemplatesPage() {
  const { t } = useTranslation(['templates', 'dossier']);
  const lang = usePreferences((state) => state.lang);
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');

  function specFor(template: TemplateDefinition): { spec: DocumentSpec; labels: DossierLabels } {
    const title = template.title[lang];
    const labels: DossierLabels = {
      documentTitle: title,
      kinds: { [template.kind]: title },
      day: (day) => String(day),
      generatedOn: (date) => t('templates:generatedOn', { date }),
      project: {
        name: t('dossier:project.name'),
        type: t('dossier:project.type'),
        scale: t('dossier:project.scale'),
        wilaya: t('dossier:project.wilaya'),
        objective: t('dossier:project.objective'),
      },
      workbook: {
        summarySheet: t('dossier:export.summarySheet'),
        section: t('dossier:export.columns.section'),
        day: t('dossier:export.columns.day'),
        type: t('dossier:export.columns.type'),
        content: t('dossier:export.columns.content'),
      },
    };

    const spec: DocumentSpec = {
      title,
      subtitle: template.description[lang],
      lang,
      rtl: lang === 'ar',
      generatedOn: t('templates:generatedOn', { date: formatDate(new Date(), lang) }),
      sections: [{ key: template.id, title, blocks: templateBlocks(template, lang) }],
    };

    return { spec, labels };
  }

  async function download(template: TemplateDefinition, kind: 'docx' | 'xlsx') {
    setState('working');
    try {
      const { spec, labels } = specFor(template);
      if (kind === 'docx') {
        const { buildDocxBlob } = await import('@/export/docx');
        downloadBlob(await buildDocxBlob(spec), safeFilename(template.title[lang], 'docx'));
      } else {
        const { buildXlsxBlob } = await import('@/export/xlsx');
        downloadBlob(
          await buildXlsxBlob(buildDossierWorkbook(spec, labels)),
          safeFilename(template.title[lang], 'xlsx'),
        );
      }
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <PageHeader title={t('templates:title')} description={t('templates:subtitle')} />

      <p className="mb-4 text-sm text-muted">{t('templates:empty')}</p>

      <ul className="space-y-4">
        {listTemplates().map((template) => (
          <li key={template.id}>
            <Card as="article">
              <h2 className="font-semibold">{template.title[lang]}</h2>
              <p className="mt-1 mb-3 text-sm text-muted">{template.description[lang]}</p>

              <details className="mb-3">
                <summary className="cursor-pointer font-medium">{t('templates:title')}</summary>
                <div className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
                  <DossierBlocks blocks={templateBlocks(template, lang)} />
                </div>
              </details>

              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  disabled={state === 'working'}
                  onClick={() => void download(template, 'docx')}
                >
                  {t('templates:download.docx')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={state === 'working'}
                  onClick={() => void download(template, 'xlsx')}
                >
                  {t('templates:download.xlsx')}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {state === 'working' ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {t('templates:working')}
        </p>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t('templates:error')}
        </p>
      ) : null}
    </>
  );
}
