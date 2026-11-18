import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DossierBlocks } from '@/components/DossierBlocks';
import { useCourse } from '@/store/course';
import { usePreferences } from '@/store/preferences';
import { formatDate } from '@/lib/format';
import { KIND_ORDER } from '@/export/model';
import { useDossierExport } from '@/export/useExport';
import type { DossierItem } from '@/domain/types';

export function DossierPage() {
  const { t } = useTranslation(['dossier', 'common', 'project']);
  const lang = usePreferences((state) => state.lang);
  const project = useCourse((state) => state.project);
  const items = useCourse((state) => state.dossier);
  const deleteItem = useCourse((state) => state.deleteDossierItem);
  const { exportDocx, exportXlsx, state: exportState } = useDossierExport();
  const [confirming, setConfirming] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byKind = new Map<string, DossierItem[]>();
    for (const item of items) {
      byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item]);
    }
    return KIND_ORDER.filter((kind) => byKind.has(kind)).map((kind) => ({
      kind,
      items: [...(byKind.get(kind) ?? [])].sort((a, b) => a.day - b.day),
    }));
  }, [items]);

  const days = new Set(items.map((item) => item.day)).size;

  if (!project) {
    return (
      <>
        <PageHeader title={t('dossier:title')} description={t('dossier:noProject')} />
        <Link to="/bienvenue">
          <Button block>{t('project:none.cta')}</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('dossier:title')} description={t('dossier:subtitle')} />

      {items.length === 0 ? (
        <Card>
          <p className="text-muted">{t('dossier:empty')}</p>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <p className="font-semibold">{t('dossier:count', { count: items.length, days })}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="secondary"
                disabled={exportState === 'working'}
                onClick={() => void exportDocx()}
              >
                {t('dossier:export.docx')}
              </Button>
              <Button
                variant="secondary"
                disabled={exportState === 'working'}
                onClick={() => void exportXlsx()}
              >
                {t('dossier:export.xlsx')}
              </Button>
            </div>
            {exportState === 'working' ? (
              <p role="status" className="mt-2 text-sm text-muted">
                {t('dossier:export.working')}
              </p>
            ) : null}
            {exportState === 'error' ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {t('dossier:export.error')}
              </p>
            ) : null}
          </Card>

          {grouped.map(({ kind, items: kindItems }) => (
            <section key={kind} className="mb-5">
              <h2 className="mb-2 font-semibold">{t(`dossier:kinds.${kind}`)}</h2>
              <ul className="space-y-3">
                {kindItems.map((item) => (
                  <li key={item.id}>
                    <Card as="article">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-muted">
                          {t('dossier:fromDay', { day: item.day })}
                          {item.version > 1
                            ? ` · ${t('dossier:revised', { count: item.version })}`
                            : ''}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(new Date(item.updatedAt), lang, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <h3 className="mb-2 font-semibold">{item.title}</h3>
                      <DossierBlocks blocks={item.blocks} />

                      {confirming === item.id ? (
                        <div className="mt-3 rounded-xl border border-danger/50 bg-danger/10 p-3">
                          <p className="mb-2 text-sm">{t('dossier:deleteConfirm')}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                void deleteItem(item.id);
                                setConfirming(null);
                              }}
                            >
                              {t('common:actions.confirm')}
                            </Button>
                            <Button variant="ghost" onClick={() => setConfirming(null)}>
                              {t('common:actions.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(item.id)}
                          className="mt-3 min-h-11 text-sm font-medium text-danger underline"
                        >
                          {t('dossier:delete')}
                        </button>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
