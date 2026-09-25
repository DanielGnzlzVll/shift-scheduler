import * as XLSX from 'xlsx';
import { normalizeName } from '../core/names.js';

const NAME_HEADERS = new Set(['nombre', 'nombres', 'persona', 'personas', 'name', 'names']);

export function readRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) return { rows: [], firstRow: 1 };
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: true, defval: null });
  return { rows, firstRow: range.s.r + 1 };
}

export function isHeaderCell(value) {
  return NAME_HEADERS.has(normalizeName(value));
}
