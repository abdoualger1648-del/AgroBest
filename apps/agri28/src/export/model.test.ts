import { describe, expect, it } from 'vitest';
import { makeProject } from '@/test/factories';
import type { DossierItem, PromptEntry } from '@/domain/types';
import {
  buildDossierDocument,
  buildDossierWorkbook,
  buildNotebookDocument,
  sanitizeSheetName,
  type DossierLabels,
} from './model';

const labels: DossierLabels = {
  documentTitle: 'Dossier de projet',
  kinds: {
    fiche_projet: 'Fiche projet',
    budget: 'Budget',
    risques: 'Risques',
    suivi: 'Suivi',
  },
  day: (day) => `Jour ${String(day)}`,
  generatedOn: (date) => `Document produit le ${date}`,
  project: {
    name: 'Nom',
    type: 'Activité',
    scale: 'Taille',
    wilaya: 'Wilaya',
    objective: 'Objectif',
  },
  workbook: {
    summarySheet: 'Synthèse',
    section: 'Section',
    day: 'Jour',
    type: 'Type',
    content: 'Contenu',
  },
};

function makeItem(overrides: Partial<DossierItem> = {}): DossierItem {
  return {
    id: 'i1',
    projectId: 'p',
    day: 1,
    kind: 'fiche_projet',
    title: 'Fiche projet',
    lang: 'fr',
    blocks: [{ type: 'paragraph', text: 'Mon projet reformulé.' }],
    sourceLessonId: 'day-01',
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
    version: 1,
    ...overrides,
  };
}

const input = {
  project: makeProject(),
  lang: 'fr' as const,
  labels,
  projectValues: { type: 'élevage ovin', scale: '60 têtes', wilaya: 'Aïn Defla' },
  generatedOn: '18 novembre 2026',
};

describe('document du Dossier', () => {
  it('ouvre sur la fiche projet, même sans aucune brique', () => {
    const spec = buildDossierDocument({ ...input, items: [] });

    expect(spec.sections).toHaveLength(1);
    expect(spec.sections[0]?.key).toBe('projet');
    const block = spec.sections[0]?.blocks[0];
    expect(block?.type).toBe('kv');
    expect(JSON.stringify(block)).toContain('Aïn Defla');
    expect(spec.rtl).toBe(false);
  });

  it('passe en RTL en arabe', () => {
    const spec = buildDossierDocument({ ...input, lang: 'ar', items: [] });
    expect(spec.rtl).toBe(true);
  });

  it('range les briques par famille et par jour', () => {
    const items = [
      makeItem({ id: 'b2', kind: 'budget', day: 9, title: 'Budget' }),
      makeItem({ id: 'r1', kind: 'risques', day: 13, title: 'Registre' }),
      makeItem({ id: 'b1', kind: 'budget', day: 5, title: 'Budget' }),
    ];
    const spec = buildDossierDocument({ ...input, items });

    expect(spec.sections.map((section) => section.key)).toEqual(['projet', 'budget', 'risques']);
    const budget = spec.sections[1];
    const headings = budget?.blocks.filter((block) => block.type === 'heading') ?? [];
    expect(headings[0]).toMatchObject({ text: 'Jour 5 — Budget' });
    expect(headings[1]).toMatchObject({ text: 'Jour 9 — Budget' });
  });

  it('ignore les familles sans brique', () => {
    const spec = buildDossierDocument({ ...input, items: [makeItem({ kind: 'suivi', day: 14 })] });
    expect(spec.sections.map((section) => section.key)).toEqual(['projet', 'suivi']);
  });
});

describe('noms de feuilles Excel', () => {
  it('retire les caractères interdits et limite à 31 caractères', () => {
    expect(sanitizeSheetName('Budget [2026] / prévisions *')).toBe('Budget 2026 prévisions');
    expect(sanitizeSheetName('x'.repeat(50))).toHaveLength(31);
  });

  it('évite les doublons', () => {
    const first = sanitizeSheetName('Budget');
    const second = sanitizeSheetName('Budget', [first]);
    expect(second).not.toBe(first);
    expect(second).toContain('Budget');
  });

  it('ne renvoie jamais un nom vide', () => {
    expect(sanitizeSheetName('***').length).toBeGreaterThan(0);
  });
});

describe('classeur du Dossier', () => {
  const items = [
    makeItem({
      id: 't1',
      kind: 'budget',
      day: 9,
      title: 'Budget',
      blocks: [
        { type: 'paragraph', text: 'Relevé du mois' },
        {
          type: 'table',
          columns: [
            { key: 'poste', label: 'Poste' },
            { key: 'montant', label: 'Montant', numeric: true },
          ],
          rows: [{ poste: 'Aliment', montant: 1000 }],
        },
      ],
    }),
  ];

  it('produit une feuille de synthèse puis une feuille par tableau', () => {
    const spec = buildDossierDocument({ ...input, items });
    const workbook = buildDossierWorkbook(spec, labels);

    expect(workbook.sheets[0]?.name).toBe('Synthèse');
    expect(workbook.sheets).toHaveLength(2);
    expect(workbook.sheets[1]?.columns.map((column) => column.key)).toEqual(['poste', 'montant']);
    expect(workbook.sheets[1]?.rows[0]).toEqual({ poste: 'Aliment', montant: 1000 });
  });

  it('met le classeur entier en RTL quand la langue est l’arabe', () => {
    const spec = buildDossierDocument({ ...input, lang: 'ar', items });
    const workbook = buildDossierWorkbook(spec, labels);

    expect(workbook.rtl).toBe(true);
    expect(workbook.sheets.every((sheet) => sheet.rtl)).toBe(true);
  });

  it('aplatit les blocs de texte dans la synthèse', () => {
    const spec = buildDossierDocument({ ...input, items });
    const summary = buildDossierWorkbook(spec, labels).sheets[0];

    const contents = summary?.rows.map((row) => String(row['content'])) ?? [];
    expect(contents.join(' | ')).toContain('Relevé du mois');
  });
});

describe('carnet de prompts', () => {
  const entry: PromptEntry = {
    id: 'e1',
    projectId: 'p',
    day: 2,
    lessonId: 'day-02',
    promptId: 'p2',
    title: 'La même demande, en quatre morceaux',
    tool: 'claude',
    lang: 'fr',
    text: 'Tu es un conseiller agricole…',
    originalText: 'Tu es un conseiller agricole…',
    tags: [],
    favorite: false,
    createdAt: 1,
    updatedAt: 1,
  };

  it('groupe les prompts par jour', () => {
    const spec = buildNotebookDocument(
      [entry, { ...entry, id: 'e2', day: 5, title: 'Le test du connu' }],
      'fr',
      {
        documentTitle: 'Carnet de prompts',
        day: (day) => `Jour ${String(day)}`,
        tool: 'Outil',
        note: 'Ce que j’en retiens :',
        generatedOn: (date) => `Produit le ${date}`,
      },
      '18 novembre 2026',
      'Mon projet',
    );

    expect(spec.sections.map((section) => section.title)).toEqual(['Jour 2', 'Jour 5']);
    expect(JSON.stringify(spec.sections[0])).toContain('conseiller agricole');
  });
});
