import { normalizeName } from '../core/names.js';
import { isHeaderCell, readRows } from './sheet.js';

export function readPeople(buffer) {
  let rows;
  try {
    ({ rows } = readRows(buffer));
  } catch {
    return { people: [], warnings: [], error: 'No se pudo leer el archivo.' };
  }
  const values = rows.map((row) => row?.[0]).filter((v) => v != null && String(v).trim() !== '');
  if (values.length && isHeaderCell(values[0])) values.shift();

  const seen = new Set();
  const people = [];
  const warnings = [];
  for (const value of values) {
    const name = String(value).trim().replace(/\s+/g, ' ');
    const key = normalizeName(name);
    if (seen.has(key)) {
      warnings.push(`Nombre duplicado omitido: ${name}`);
      continue;
    }
    seen.add(key);
    people.push(name);
  }
  if (!people.length) return { people: [], warnings, error: 'El archivo no contiene nombres.' };
  return { people, warnings, error: null };
}
