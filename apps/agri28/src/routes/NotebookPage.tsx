import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CopyButton } from '@/components/CopyButton';
import { CheckIcon } from '@/components/Icon';
import { inputClass } from '@/components/Field';
import { useCourse } from '@/store/course';
import { getTool } from '@/content/catalog';
import { useNotebookExport } from '@/export/useExport';
import type { PromptEntry } from '@/domain/types';

function matches(entry: PromptEntry, query: string): boolean {
  if (!query) return true;
  const haystack = `${entry.title} ${entry.text} ${entry.tags.join(' ')}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function PromptCard({ entry }: { entry: PromptEntry }) {
  const { t } = useTranslation(['notebook', 'common']);
  const updatePrompt = useCourse((state) => state.updatePrompt);
  const deletePrompt = useCourse((state) => state.deletePrompt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [note, setNote] = useState(entry.resultNote ?? '');
  const [confirming, setConfirming] = useState(false);

  const tool = getTool(entry.tool);
  const modified = entry.text !== entry.originalText;

  return (
    <Card as="article">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {t('notebook:fromDay', { day: entry.day })}
            {tool ? ` · ${tool.name}` : ''}
            {modified ? ` · ${t('notebook:modified')}` : ''}
          </p>
          <h3 className="mt-1 font-semibold">{entry.title}</h3>
        </div>
        <button
          type="button"
          aria-label={entry.favorite ? t('notebook:unfavorite') : t('notebook:favorite')}
          aria-pressed={entry.favorite}
          onClick={() => void updatePrompt(entry.id, { favorite: !entry.favorite })}
          className={`min-h-11 min-w-11 shrink-0 rounded-xl text-xl ${
            entry.favorite ? 'text-accent' : 'text-muted'
          }`}
        >
          {entry.favorite ? '★' : '☆'}
        </button>
      </div>

      {editing ? (
        <>
          <textarea
            className={`${inputClass} min-h-40 font-mono text-sm`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={entry.title}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void updatePrompt(entry.id, { text: draft });
                setEditing(false);
              }}
            >
              <CheckIcon width="18" height="18" />
              {t('notebook:save')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(entry.text);
                setEditing(false);
              }}
            >
              {t('notebook:cancel')}
            </Button>
            {modified ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(entry.originalText);
                  void updatePrompt(entry.id, { text: entry.originalText });
                  setEditing(false);
                }}
              >
                {t('notebook:restore')}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-surface-2 p-3 text-sm whitespace-pre-wrap">
            {entry.text}
          </pre>
          <div className="mt-2 flex flex-col gap-2">
            <CopyButton
              text={entry.text}
              label={t('notebook:copy')}
              copiedLabel={t('notebook:copied')}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t('notebook:edit')}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                {t('notebook:delete')}
              </Button>
            </div>
          </div>
        </>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium">{t('notebook:note')}</span>
        <textarea
          className={`${inputClass} min-h-20`}
          value={note}
          placeholder={t('notebook:notePlaceholder')}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== (entry.resultNote ?? ''))
              void updatePrompt(entry.id, { resultNote: note });
          }}
        />
      </label>

      {confirming ? (
        <div className="mt-3 rounded-xl border border-danger/50 bg-danger/10 p-3">
          <p className="mb-2 text-sm">{t('notebook:deleteConfirm')}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void deletePrompt(entry.id)}>
              {t('common:actions.confirm')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function NotebookPage() {
  const { t } = useTranslation(['notebook', 'common']);
  const prompts = useCourse((state) => state.prompts);
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { exportDocx, state: exportState, canExport } = useNotebookExport();

  const visible = useMemo(
    () => prompts.filter((entry) => (!favoritesOnly || entry.favorite) && matches(entry, query)),
    [favoritesOnly, prompts, query],
  );

  return (
    <>
      <PageHeader title={t('notebook:title')} description={t('notebook:subtitle')} />

      {prompts.length === 0 ? (
        <Card>
          <p className="text-muted">{t('notebook:empty')}</p>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="prompt-search" className="mb-1 block font-medium">
              {t('notebook:search')}
            </label>
            <input
              id="prompt-search"
              type="search"
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label className="mt-2 flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(event) => setFavoritesOnly(event.target.checked)}
                className="size-5 accent-[var(--c-primary)]"
              />
              <span>{t('notebook:favoritesOnly')}</span>
            </label>
          </div>

          {canExport ? (
            <Button
              variant="secondary"
              block
              className="mb-4"
              disabled={exportState === 'working'}
              onClick={() => void exportDocx()}
            >
              {t('notebook:export.docx')}
            </Button>
          ) : null}

          {visible.length === 0 ? (
            <Card>
              <p className="text-muted">{t('notebook:searchEmpty')}</p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {visible.map((entry) => (
                <li key={entry.id}>
                  <PromptCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
