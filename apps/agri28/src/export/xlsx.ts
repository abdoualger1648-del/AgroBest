import type { WorkbookSpec } from './model';

/**
 * Export .xlsx. ExcelJS est chargé à la demande.
 * RTL : `worksheet.views = [{ rightToLeft: true }]`, documenté par ExcelJS.
 */
export async function buildXlsxBlob(spec: WorkbookSpec): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  for (const sheet of spec.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, {
      views: [{ rightToLeft: sheet.rtl, state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = sheet.columns.map((column) => ({
      header: column.label,
      key: column.key,
      width: column.numeric ? 14 : 32,
      style: {
        alignment: {
          horizontal: sheet.rtl ? 'right' : 'left',
          vertical: 'top',
          wrapText: true,
          readingOrder: sheet.rtl ? 'rtl' : 'ltr',
        },
      },
    }));

    worksheet.getRow(1).font = { bold: true };
    for (const row of sheet.rows) worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
