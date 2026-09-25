import { normalizeName } from '../core/names.js';
import { DAY_MINUTES, fromMinutes, toMinutes } from '../core/time.js';
import { serialToMinutes } from './excelDates.js';
import { isHeaderCell, readRows } from './sheet.js';

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/;
const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/;

export function parseDateCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return serialToMinutes(value);
  const text = String(value ?? '').trim();
  let parts = null;
  let match;
  if ((match = ISO.exec(text))) parts = [match[1], match[2], match[3], match[4], match[5]];
  else if ((match = DMY.exec(text))) parts = [match[3], match[2], match[1], match[4], match[5]];
  if (!parts) return null;
  const [year, month, day, hour = 0, minute = 0] = parts.map((p) => (p === undefined ? undefined : Number(p)));
  if (hour > 23 || minute > 59) return null;
  const minutes = toMinutes(year, month, day, hour * 60 + minute);
  const check = fromMinutes(minutes);
  if (check.year !== year || check.month !== month || check.day !== day) return null;
  return minutes;
}

const isBlank = (v) => v == null || String(v).trim() === '';

export function readExceptions(buffer, people) {
  let rows;
  let firstRow;
  try {
    ({ rows, firstRow } = readRows(buffer));
  } catch {
    return { exceptions: [], rowErrors: [], error: 'No se pudo leer el archivo.' };
  }
  const byKey = new Map(people.map((p) => [normalizeName(p), p]));
  const exceptions = [];
  const rowErrors = [];

  rows.forEach((row, index) => {
    const [nameCell, startCell, endCell] = row ?? [];
    const rowNumber = firstRow + index;
    const fail = (reason) => rowErrors.push({ row: rowNumber, reason });
    if ([nameCell, startCell, endCell].every(isBlank)) return;
    if (index === 0 && isHeaderCell(nameCell)) return;

    const name = String(nameCell ?? '').trim();
    if (!name) return fail('Falta el nombre');
    const person = byKey.get(normalizeName(name));
    if (!person) return fail(`Nombre desconocido: ${name}`);
    const start = parseDateCell(startCell);
    if (start === null) return fail('Fecha de inicio inválida');
    let end = parseDateCell(endCell);
    if (end === null) return fail('Fecha de fin inválida');
    if (end % DAY_MINUTES === 0) end += DAY_MINUTES;
    if (end <= start) return fail('La fecha de fin debe ser posterior al inicio');
    exceptions.push({ person, start, end });
  });

  return { exceptions, rowErrors, error: null };
}
