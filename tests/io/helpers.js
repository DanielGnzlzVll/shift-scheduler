import * as XLSX from 'xlsx';

export function workbookBuffer(rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Hoja1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

export function csvBuffer(text) {
  return new TextEncoder().encode(text).buffer;
}
