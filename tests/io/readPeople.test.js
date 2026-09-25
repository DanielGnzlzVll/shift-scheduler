import { describe, expect, it } from 'vitest';
import { readPeople } from '../../src/io/readPeople.js';
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
