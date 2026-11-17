import type { Capture, Lesson } from '@/content/schema';
import { toPlainText } from '@/content/markdown';
import type { Lang } from '@/lib/lang';
import type { DossierBlock, DossierItem } from './types';

/**
 * Transforme les saisies d'une journée en briques de Dossier.
 * La représentation est neutre (DossierBlock) : elle alimentera aussi bien
 * l'affichage que les exports .docx et .xlsx (décision D7).
 */
export function buildDossierBlocks(
  lesson: Lesson,
  captures: Readonly<Record<string, string>>,
): Map<string, DossierBlock[]> {
  const byKind = new Map<string, DossierBlock[]>();

  for (const step of lesson.sections.practice.steps) {
    const capture: Capture | undefined = step.capture;
    if (!capture?.dossier) continue;

    const value = captures[capture.id]?.trim();
    if (!value) continue;

    const blocks = byKind.get(capture.dossier.kind) ?? [];

    switch (capture.dossier.block) {
      case 'paragraph':
        blocks.push({ type: 'paragraph', text: value });
        break;
      case 'list':
        blocks.push({
          type: 'list',
          ordered: false,
          items: value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        });
        break;
      case 'kv':
        blocks.push({
          type: 'kv',
          rows: [{ key: toPlainText(capture.dossier.key ?? capture.label), value }],
        });
        break;
      case 'table':
        blocks.push({
          type: 'table',
          columns: [{ key: 'valeur', label: toPlainText(capture.label) }],
          rows: value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => ({ valeur: line })),
        });
        break;
    }

    byKind.set(capture.dossier.kind, blocks);
  }

  return byKind;
}

export interface DossierDraft {
  kind: string;
  title: string;
  blocks: DossierBlock[];
}

/** Briques prêtes à être enregistrées pour une journée validée. */
export function dossierDraftsFor(
  lesson: Lesson,
  captures: Readonly<Record<string, string>>,
): DossierDraft[] {
  const blocksByKind = buildDossierBlocks(lesson, captures);
  const title = toPlainText(lesson.produces?.label ?? lesson.title);

  return [...blocksByKind.entries()].map(([kind, blocks]) => ({ kind, title, blocks }));
}

/** Nombre de briques réellement produites : affiché dans le bilan. */
export function countBlocks(items: readonly DossierItem[]): number {
  return items.reduce((total, item) => total + item.blocks.length, 0);
}

export function blocksToPlainText(blocks: readonly DossierBlock[], lang: Lang): string {
  const bullet = lang === 'ar' ? '•' : '—';
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return block.text;
        case 'paragraph':
        case 'note':
          return block.text;
        case 'list':
          return block.items.map((item) => `${bullet} ${item}`).join('\n');
        case 'kv':
          return block.rows.map((row) => `${row.key} : ${row.value}`).join('\n');
        case 'table':
          return [
            block.columns.map((column) => column.label).join(' | '),
            ...block.rows.map((row) =>
              block.columns.map((column) => String(row[column.key] ?? '')).join(' | '),
            ),
          ].join('\n');
      }
    })
    .join('\n\n');
}
