import type { DossierBlock, DossierItem, Project, PromptEntry } from '@/domain/types';
import type { DossierKind } from '@/content/schema';
import type { Lang } from '@/lib/lang';

/**
 * Représentation neutre d'un document à exporter (décision D7).
 * Ces fonctions sont PURES : aucune dépendance à docx, exceljs ou au DOM,
 * donc entièrement testables. Les libellés traduits sont fournis par l'appelant,
 * pour que ce module ne dépende pas d'i18next.
 */

export interface DocumentSection {
  /** Identifiant stable, utile pour les tests et les noms de feuilles. */
  key: string;
  title: string;
  day?: number;
  blocks: DossierBlock[];
}

export interface DocumentSpec {
  title: string;
  subtitle: string;
  lang: Lang;
  rtl: boolean;
  generatedOn: string;
  sections: DocumentSection[];
}

export interface SheetColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface SheetSpec {
  name: string;
  rtl: boolean;
  columns: SheetColumn[];
  rows: Record<string, string | number>[];
}

export interface WorkbookSpec {
  rtl: boolean;
  sheets: SheetSpec[];
}

/** Ordre de présentation des briques dans le Dossier. */
export const KIND_ORDER: readonly DossierKind[] = [
  'fiche_projet',
  'objectifs',
  'budget',
  'calendrier',
  'equipe',
  'achats',
  'risques',
  'suivi',
  'rapport',
  'libre',
];

export interface DossierLabels {
  /** Titre du document. */
  documentTitle: string;
  /** Libellé de chaque famille de briques. */
  kinds: Record<string, string>;
  /** « Jour {{day}} ». */
  day: (day: number) => string;
  /** Pied de page : « Document produit le … ». */
  generatedOn: (date: string) => string;
  /** Intitulés de la fiche d'en-tête. */
  project: {
    name: string;
    type: string;
    scale: string;
    wilaya: string;
    objective: string;
  };
  /** Feuille de synthèse du classeur. */
  workbook: {
    summarySheet: string;
    section: string;
    day: string;
    type: string;
    content: string;
  };
}

function headerBlocks(
  project: Project,
  labels: DossierLabels,
  values: { type: string; scale: string; wilaya: string },
): DossierBlock[] {
  return [
    {
      type: 'kv',
      rows: [
        { key: labels.project.name, value: project.name },
        { key: labels.project.type, value: values.type },
        { key: labels.project.scale, value: values.scale },
        { key: labels.project.wilaya, value: values.wilaya },
        { key: labels.project.objective, value: project.objective },
      ],
    },
  ];
}

export interface BuildDossierInput {
  project: Project;
  items: readonly DossierItem[];
  lang: Lang;
  labels: DossierLabels;
  /** Valeurs déjà traduites du projet (type, taille, wilaya). */
  projectValues: { type: string; scale: string; wilaya: string };
  generatedOn: string;
}

/** Assemble le Dossier de projet : en-tête, puis une section par famille. */
export function buildDossierDocument(input: BuildDossierInput): DocumentSpec {
  const { project, items, lang, labels, projectValues, generatedOn } = input;

  const sections: DocumentSection[] = [
    {
      key: 'projet',
      title: labels.kinds['fiche_projet'] ?? 'fiche_projet',
      blocks: headerBlocks(project, labels, projectValues),
    },
  ];

  for (const kind of KIND_ORDER) {
    const ofKind = items
      .filter((item) => item.kind === kind)
      .sort((a, b) => a.day - b.day || a.createdAt - b.createdAt);
    if (ofKind.length === 0) continue;

    const blocks: DossierBlock[] = [];
    for (const item of ofKind) {
      blocks.push({ type: 'heading', level: 3, text: `${labels.day(item.day)} — ${item.title}` });
      blocks.push(...item.blocks);
    }
    sections.push({ key: kind, title: labels.kinds[kind] ?? kind, blocks });
  }

  return {
    title: labels.documentTitle,
    subtitle: project.name,
    lang,
    rtl: lang === 'ar',
    generatedOn: labels.generatedOn(generatedOn),
    sections,
  };
}

/** Rend un nom de feuille acceptable par Excel : 31 caractères, sans [ ] : * ? / \ */
export function sanitizeSheetName(name: string, used: readonly string[] = []): string {
  const cleaned =
    name
      .replace(/[[\]:*?/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Feuille';
  let candidate = cleaned.slice(0, 31);
  let index = 2;
  while (used.includes(candidate)) {
    const suffix = ` (${String(index)})`;
    candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  return candidate;
}

function blockToText(block: DossierBlock, bullet: string): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'note':
      return block.text;
    case 'list':
      return block.items.map((item) => `${bullet} ${item}`).join('\n');
    case 'kv':
      return block.rows.map((row) => `${row.key} : ${row.value}`).join('\n');
    case 'table':
      return block.columns.map((column) => column.label).join(' | ');
  }
}

/**
 * Classeur : une feuille de synthèse qui reprend tout le Dossier à plat,
 * puis une feuille par tableau, car un tableau se travaille dans un tableur.
 */
export function buildDossierWorkbook(spec: DocumentSpec, labels: DossierLabels): WorkbookSpec {
  const bullet = spec.rtl ? '•' : '—';
  const used: string[] = [];
  const summaryName = sanitizeSheetName(labels.workbook.summarySheet, used);
  used.push(summaryName);

  const summaryRows: Record<string, string | number>[] = [];
  const sheets: SheetSpec[] = [];

  for (const section of spec.sections) {
    let currentDay = '';
    for (const block of section.blocks) {
      if (block.type === 'heading') {
        currentDay = block.text;
        continue;
      }
      if (block.type === 'table') {
        const name = sanitizeSheetName(`${section.title} ${String(sheets.length + 1)}`, used);
        used.push(name);
        sheets.push({
          name,
          rtl: spec.rtl,
          columns: block.columns,
          rows: block.rows,
        });
        summaryRows.push({
          section: section.title,
          day: currentDay,
          type: 'table',
          content: name,
        });
        continue;
      }
      summaryRows.push({
        section: section.title,
        day: currentDay,
        type: block.type,
        content: blockToText(block, bullet),
      });
    }
  }

  const summary: SheetSpec = {
    name: summaryName,
    rtl: spec.rtl,
    columns: [
      { key: 'section', label: labels.workbook.section },
      { key: 'day', label: labels.workbook.day },
      { key: 'type', label: labels.workbook.type },
      { key: 'content', label: labels.workbook.content },
    ],
    rows: summaryRows,
  };

  return { rtl: spec.rtl, sheets: [summary, ...sheets] };
}

export interface NotebookLabels {
  documentTitle: string;
  day: (day: number) => string;
  tool: string;
  note: string;
  generatedOn: (date: string) => string;
}

/** Carnet de prompts : une section par jour, un bloc par prompt. */
export function buildNotebookDocument(
  entries: readonly PromptEntry[],
  lang: Lang,
  labels: NotebookLabels,
  generatedOn: string,
  subtitle: string,
): DocumentSpec {
  const byDay = new Map<number, PromptEntry[]>();
  for (const entry of entries) {
    byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry]);
  }

  const sections: DocumentSection[] = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, dayEntries]) => {
      const blocks: DossierBlock[] = [];
      for (const entry of dayEntries) {
        blocks.push({ type: 'heading', level: 3, text: entry.title });
        blocks.push({ type: 'kv', rows: [{ key: labels.tool, value: entry.tool }] });
        blocks.push({ type: 'paragraph', text: entry.text });
        if (entry.resultNote) {
          blocks.push({
            type: 'note',
            variant: 'info',
            text: `${labels.note} ${entry.resultNote}`,
          });
        }
      }
      return { key: `day-${String(day)}`, title: labels.day(day), day, blocks };
    });

  return {
    title: labels.documentTitle,
    subtitle,
    lang,
    rtl: lang === 'ar',
    generatedOn: labels.generatedOn(generatedOn),
    sections,
  };
}
