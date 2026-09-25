import * as XLSX from 'xlsx';
import { normalizeName } from '../core/names.js';

const NAME_HEADERS = new Set(['nombre', 'nombres', 'persona', 'personas', 'name', 'names']);

const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b;
const isOle = (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

function decodeText(bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function readWorkbook(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (isZip(bytes) || isOle(bytes)) return XLSX.read(bytes, { type: 'array', raw: true });
  return XLSX.read(decodeText(bytes), { type: 'string', raw: true });
}

export function readRows(buffer) {
  const workbook = readWorkbook(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) return { rows: [], firstRow: 1 };
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: true, defval: null });
  return { rows, firstRow: range.s.r + 1 };
}

export function isHeaderCell(value) {
  return NAME_HEADERS.has(normalizeName(value));
}
