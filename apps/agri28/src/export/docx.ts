import type { Paragraph as ParagraphElement, Table as TableElement } from 'docx';
import type { DossierBlock } from '@/domain/types';
import type { DocumentSpec } from './model';

/**
 * Export .docx. La bibliothèque `docx` est chargée à la demande : elle ne doit
 * jamais entrer dans le paquet initial.
 *
 * RTL (vérifié dans les types du paquet et sur le XML produit) :
 * - paragraphe : `bidirectional: true` + alignement LOGIQUE `START`
 * - run : `rightToLeft: true` + police de script complexe
 * - tableau : `visuallyRightToLeft: true`
 */

const LATIN_FONT = 'Calibri';
const ARABIC_FONT = 'Arial';

export async function buildDocxBlob(spec: DocumentSpec): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx');

  const rtl = spec.rtl;
  const font = rtl ? ARABIC_FONT : LATIN_FONT;

  const run = (text: string, options: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
    new TextRun({
      text,
      rightToLeft: rtl,
      font: { ascii: font, cs: font },
      ...(options.bold === undefined ? {} : { bold: options.bold }),
      ...(options.italics === undefined ? {} : { italics: options.italics }),
      ...(options.size === undefined
        ? {}
        : { size: options.size, sizeComplexScript: options.size }),
    });

  const paragraph = (
    text: string,
    options: {
      bold?: boolean;
      italics?: boolean;
      heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
      bullet?: boolean;
      spacingAfter?: number;
    } = {},
  ) =>
    new Paragraph({
      children: [
        run(text, {
          ...(options.bold === undefined ? {} : { bold: options.bold }),
          ...(options.italics === undefined ? {} : { italics: options.italics }),
        }),
      ],
      bidirectional: rtl,
      // Alignement LOGIQUE : vérifié sur la bibliothèque, un alignement absolu
      // (RIGHT) combiné à `bidirectional` est inversé et sort en `w:jc=left`,
      // soit l'inverse du résultat voulu en arabe. `START` sort en `w:jc=start`,
      // que Word résout à droite dans un paragraphe bidirectionnel.
      alignment: AlignmentType.START,
      ...(options.heading ? { heading: options.heading } : {}),
      ...(options.bullet ? { bullet: { level: 0 } } : {}),
      spacing: { after: options.spacingAfter ?? 120 },
    });

  const cell = (text: string, bold = false) =>
    new TableCell({
      children: [paragraph(text, { bold, spacingAfter: 0 })],
      margins: { top: 60, bottom: 60, left: 100, right: 100 }, // rtl-ok : marges OOXML symétriques, pas du CSS
    });

  function blockToElements(block: DossierBlock): (ParagraphElement | TableElement)[] {
    switch (block.type) {
      case 'heading':
        return [
          paragraph(block.text, {
            heading:
              block.level === 1
                ? HeadingLevel.HEADING_1
                : block.level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            bold: true,
          }),
        ];
      case 'paragraph':
        return [paragraph(block.text)];
      case 'note':
        return [paragraph(block.text, { italics: true })];
      case 'list':
        return block.items.map((item) => paragraph(item, { bullet: true }));
      case 'kv':
        return [
          new Table({
            visuallyRightToLeft: rtl,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: block.rows.map(
              (row) => new TableRow({ children: [cell(row.key, true), cell(String(row.value))] }),
            ),
          }),
        ];
      case 'table':
        return [
          new Table({
            visuallyRightToLeft: rtl,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: block.columns.map((column) => cell(column.label, true)) }),
              ...block.rows.map(
                (row) =>
                  new TableRow({
                    children: block.columns.map((column) => cell(String(row[column.key] ?? ''))),
                  }),
              ),
            ],
          }),
        ];
    }
  }

  const children: (ParagraphElement | TableElement)[] = [
    paragraph(spec.title, { heading: HeadingLevel.TITLE, bold: true }),
    paragraph(spec.subtitle, { italics: true }),
  ];

  for (const section of spec.sections) {
    children.push(paragraph(section.title, { heading: HeadingLevel.HEADING_2, bold: true }));
    for (const block of section.blocks) children.push(...blockToElements(block));
  }

  children.push(paragraph(spec.generatedOn, { italics: true }));

  const document = new Document({
    styles: { default: { document: { run: { font: { ascii: font, cs: font }, size: 22 } } } },
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBlob(document);
  return buffer;
}
