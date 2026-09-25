import { describe, expect, it } from 'vitest';
import { readExceptions } from '../../src/io/readExceptions.js';
import { readPeople } from '../../src/io/readPeople.js';
import { toMinutes } from '../../src/core/time.js';
import { csvBuffer, workbookBuffer } from './helpers.js';

describe('readPeople', () => {
  it('skips header, trims, dedupes and warns', () => {
    const result = readPeople(workbookBuffer([['Nombre'], ['  Ana '], ['Luis'], ['ana'], [null], ['José   Pérez']]));
    expect(result).toEqual({
      people: ['Ana', 'Luis', 'José Pérez'],
      warnings: ['Nombre duplicado omitido: ana'],
      error: null,
    });
  });

  it('reads files without header and ignores other columns', () => {
    expect(readPeople(workbookBuffer([['Ana', 'x'], ['Luis', 'y']])).people).toEqual(['Ana', 'Luis']);
  });

  it('reads CSV', () => {
    expect(readPeople(csvBuffer('nombre\nAna\nLuis\n')).people).toEqual(['Ana', 'Luis']);
  });

  it('reads UTF-8 CSV without BOM keeping accents', () => {
    expect(readPeople(csvBuffer('nombre\nJosé Pérez\nMaría\n')).people).toEqual(['José Pérez', 'María']);
  });

  it('reads UTF-8 CSV with BOM', () => {
    expect(readPeople(csvBuffer('\uFEFFnombre\nMaría\n')).people).toEqual(['María']);
  });

  it('reads windows-1252 CSV', () => {
    const bytes = new Uint8Array([...'nombre\nJos'].map((c) => c.charCodeAt(0)).concat([0xe9, 0x0a]));
    expect(readPeople(bytes.buffer).people).toEqual(['José']);
  });

  it('matches accented names in UTF-8 exceptions CSV', () => {
    const result = readExceptions(csvBuffer('nombre,inicio,fin\nJosé Pérez,2026-10-05 07:00,2026-10-06\n'), ['José Pérez']);
    expect(result.rowErrors).toEqual([]);
    expect(result.exceptions).toEqual([{ person: 'José Pérez', start: toMinutes(2026, 10, 5, 420), end: toMinutes(2026, 10, 7) }]);
  });

  it('converts numeric cells to text', () => {
    expect(readPeople(workbookBuffer([[101], [102]])).people).toEqual(['101', '102']);
  });

  it('errors when there are no names', () => {
    expect(readPeople(workbookBuffer([['Nombre']]))).toEqual({
      people: [],
      warnings: [],
      error: 'El archivo no contiene nombres.',
    });
  });
});
