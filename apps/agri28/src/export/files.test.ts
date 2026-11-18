import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { makeProject } from '@/test/factories';
import type { DossierItem } from '@/domain/types';
import { buildDossierDocument, buildDossierWorkbook, type DossierLabels } from './model';
import { buildDocxBlob } from './docx';
import { buildXlsxBlob } from './xlsx';
import { safeFilename } from './download';

const labels: DossierLabels = {
  documentTitle: 'Dossier de projet',
  kinds: { fiche_projet: 'Fiche projet', budget: 'Budget' },
  day: (day) => `Jour ${String(day)}`,
  generatedOn: (date) => `Produit le ${date}`,
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

const items: DossierItem[] = [
  {
    id: 'b1',
    projectId: 'p',
    day: 9,
    kind: 'budget',
    title: 'Budget',
    lang: 'fr',
    blocks: [
      { type: 'paragraph', text: 'Relevé effectué chez le fournisseur.' },
      {
        type: 'table',
        columns: [
          { key: 'poste', label: 'Poste' },
          { key: 'montant', label: 'Montant', numeric: true },
        ],
        rows: [{ poste: 'Aliment', montant: 1000 }],
      },
    ],
    sourceLessonId: 'day-09',
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
    version: 1,
  },
];

function specFor(lang: 'fr' | 'ar') {
  return buildDossierDocument({
    project: makeProject({ name: lang === 'ar' ? 'تربية الأغنام' : 'Élevage ovin' }),
    items,
    lang,
    labels,
    projectValues: { type: 'élevage ovin', scale: '60', wilaya: 'Aïn Defla' },
    generatedOn: '18/11/2026',
  });
}

async function entriesOf(blob: Blob): Promise<Record<string, string>> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const files = unzipSync(buffer);
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) {
    if (name.endsWith('.xml') || name.endsWith('.rels')) out[name] = strFromU8(bytes);
  }
  return out;
}

describe('fichier .docx', () => {
  it('produit un document Word non vide, contenant le texte', async () => {
    const blob = await buildDocxBlob(specFor('fr'));
    expect(blob.size).toBeGreaterThan(1000);

    const files = await entriesOf(blob);
    const document = files['word/document.xml'] ?? '';
    expect(document).toContain('Dossier de projet');
    expect(document).toContain('Relevé effectué chez le fournisseur.');
    expect(document).toContain('Aliment');
  });

  it('écrit les marqueurs RTL en arabe, et pas en français', async () => {
    const arabic = await entriesOf(await buildDocxBlob(specFor('ar')));
    const french = await entriesOf(await buildDocxBlob(specFor('fr')));

    const arDocument = arabic['word/document.xml'] ?? '';
    const frDocument = french['word/document.xml'] ?? '';

    // Arabe : paragraphe bidirectionnel, runs droite-à-gauche, tableau en miroir.
    expect(arDocument).toContain('<w:bidi/>');
    expect(arDocument).toContain('<w:rtl/>');
    expect(arDocument).toContain('<w:bidiVisual/>');

    // Alignement LOGIQUE : « start » vaut droite dans un paragraphe bidirectionnel.
    // Un alignement absolu serait silencieusement inversé par la bibliothèque.
    expect(arDocument).toContain('<w:jc w:val="start"/>');
    expect(arDocument).not.toContain('<w:jc w:val="left"/>');
    expect(arDocument).not.toContain('<w:jc w:val="right"/>');

    // Français : les mêmes marqueurs, explicitement désactivés.
    expect(frDocument).toContain('<w:bidi w:val="false"/>');
    expect(frDocument).toContain('<w:rtl w:val="false"/>');
    expect(frDocument).toContain('<w:bidiVisual w:val="off"/>');
    expect(frDocument).toContain('<w:jc w:val="start"/>');
  });

  it('déclare une police de script complexe', async () => {
    const files = await entriesOf(await buildDocxBlob(specFor('ar')));
    const styles = files['word/styles.xml'] ?? '';
    expect(styles).toContain('w:cs="Arial"');
  });
});

describe('fichier .xlsx', () => {
  it('produit un classeur avec une feuille par tableau', async () => {
    const spec = specFor('fr');
    const blob = await buildXlsxBlob(buildDossierWorkbook(spec, labels));
    expect(blob.size).toBeGreaterThan(1000);

    const files = await entriesOf(blob);
    const workbook = files['xl/workbook.xml'] ?? '';
    expect(workbook).toContain('Synthèse');
    expect(Object.keys(files).filter((name) => name.startsWith('xl/worksheets/')).length).toBe(2);
  });

  it('met les feuilles en RTL en arabe seulement', async () => {
    const arabic = await entriesOf(
      await buildXlsxBlob(buildDossierWorkbook(specFor('ar'), labels)),
    );
    const french = await entriesOf(
      await buildXlsxBlob(buildDossierWorkbook(specFor('fr'), labels)),
    );

    const arSheet = arabic['xl/worksheets/sheet1.xml'] ?? '';
    const frSheet = french['xl/worksheets/sheet1.xml'] ?? '';

    expect(arSheet).toContain('rightToLeft="1"');
    expect(frSheet).not.toContain('rightToLeft="1"');
  });
});

describe('noms de fichiers', () => {
  it('produit un nom sûr à partir du nom du projet', () => {
    expect(safeFilename('Élevage ovin / Aïn Defla', 'docx')).toBe('Elevage-ovin-Ain-Defla.docx');
    expect(safeFilename('***', 'xlsx')).toBe('document.xlsx');
    expect(safeFilename('تربية الأغنام', 'pdf')).toMatch(/\.pdf$/);
  });
});
