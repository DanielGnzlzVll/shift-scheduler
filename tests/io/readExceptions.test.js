import { describe, expect, it } from 'vitest';
import { parseDateCell, readExceptions } from '../../src/io/readExceptions.js';
import { minutesToSerial } from '../../src/io/excelDates.js';
import { toMinutes } from '../../src/core/time.js';
import { workbookBuffer } from './helpers.js';

const serial = (y, m, d, minutes = 0) => minutesToSerial(toMinutes(y, m, d, minutes));
const PEOPLE = ['José Pérez', 'Ana'];

describe('parseDateCell', () => {
  it('parses serials and text formats', () => {
    expect(parseDateCell(serial(2026, 10, 5, 420))).toBe(toMinutes(2026, 10, 5, 420));
    expect(parseDateCell('2026-10-05 07:30')).toBe(toMinutes(2026, 10, 5, 450));
    expect(parseDateCell('2026-10-05')).toBe(toMinutes(2026, 10, 5));
    expect(parseDateCell('05/10/2026 7:00')).toBe(toMinutes(2026, 10, 5, 420));
    expect(parseDateCell('05/10/2026')).toBe(toMinutes(2026, 10, 5));
  });

  it('rejects invalid values', () => {
    for (const value of ['31/02/2026', '2026-13-01', '2026-10-05 25:00', 'mañana', '', null]) {
      expect(parseDateCell(value)).toBeNull();
    }
  });
});

describe('readExceptions', () => {
  it('reads datetime cells', () => {
    const buffer = workbookBuffer([
      ['nombre', 'inicio', 'fin'],
      ['José Pérez', serial(2026, 10, 5, 420), serial(2026, 10, 6, 1140)],
    ]);
    expect(readExceptions(buffer, PEOPLE)).toEqual({
      exceptions: [{ person: 'José Pérez', start: toMinutes(2026, 10, 5, 420), end: toMinutes(2026, 10, 6, 1140) }],
      rowErrors: [],
      error: null,
    });
  });

  it('matches names ignoring accents, case and spaces', () => {
    const buffer = workbookBuffer([[' jose  perez ', serial(2026, 10, 5, 420), serial(2026, 10, 5, 1140)]]);
    expect(readExceptions(buffer, PEOPLE).exceptions[0].person).toBe('José Pérez');
  });

  it('parses text dates and date-only ends', () => {
    const buffer = workbookBuffer([
      ['Nombre', 'Inicio', 'Fin'],
      ['Ana', '05/10/2026 7:00', '2026-10-06'],
      ['Ana', serial(2026, 10, 10), serial(2026, 10, 12)],
    ]);
    expect(readExceptions(buffer, PEOPLE).exceptions).toEqual([
      { person: 'Ana', start: toMinutes(2026, 10, 5, 420), end: toMinutes(2026, 10, 7) },
      { person: 'Ana', start: toMinutes(2026, 10, 10), end: toMinutes(2026, 10, 13) },
    ]);
  });

  it('reports invalid rows with Excel row numbers and keeps valid ones', () => {
    const buffer = workbookBuffer([
      ['nombre', 'inicio', 'fin'],
      ['Pedro', serial(2026, 10, 5), serial(2026, 10, 6)],
      ['Ana', 'xx', serial(2026, 10, 6)],
      ['Ana', serial(2026, 10, 5), 'yy'],
      ['Ana', serial(2026, 10, 6, 600), serial(2026, 10, 6, 300)],
      ['', serial(2026, 10, 5), serial(2026, 10, 6)],
      ['Ana', serial(2026, 10, 5), serial(2026, 10, 6)],
    ]);
    const result = readExceptions(buffer, PEOPLE);
    expect(result.rowErrors).toEqual([
      { row: 2, reason: 'Nombre desconocido: Pedro' },
      { row: 3, reason: 'Fecha de inicio inválida' },
      { row: 4, reason: 'Fecha de fin inválida' },
      { row: 5, reason: 'La fecha de fin debe ser posterior al inicio' },
      { row: 6, reason: 'Falta el nombre' },
    ]);
    expect(result.exceptions).toHaveLength(1);
  });
});
