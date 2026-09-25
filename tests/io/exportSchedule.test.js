import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { buildScheduleWorkbook, scheduleFileName } from '../../src/io/exportSchedule.js';
import { serialToMinutes } from '../../src/io/excelDates.js';
import { toMinutes } from '../../src/core/time.js';

const config = {
  year: 2026,
  month: 2,
  shifts: [
    { id: 'd', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 1, requiredWeekend: 1 },
    { id: 'n', name: 'Noche', code: 'N', start: '19:00', end: '07:00', requiredWeekday: 1, requiredWeekend: 1 },
  ],
  holidays: [],
  weeklyHours: 42,
  minRestHours: 12,
  maxConsecutiveDays: 6,
  allowOvertime: true,
};
const people = ['Ana', 'Luis'];
const result = (uncovered = []) => ({
  seed: 1,
  assignments: [
    { person: 'Ana', slotId: '2026-02-01|d', date: '2026-02-01', shiftId: 'd', start: toMinutes(2026, 2, 1, 420), end: toMinutes(2026, 2, 1, 1140), hours: 12 },
    { person: 'Luis', slotId: '2026-02-01|n', date: '2026-02-01', shiftId: 'n', start: toMinutes(2026, 2, 1, 1140), end: toMinutes(2026, 2, 2, 420), hours: 12 },
  ],
  uncovered,
  report: [
    { person: 'Ana', hours: 12, target: 168, diff: -156, shifts: 1, byShift: { d: 1, n: 0 }, weekendShifts: 1 },
    { person: 'Luis', hours: 12, target: 168, diff: -156, shifts: 1, byShift: { d: 0, n: 1 }, weekendShifts: 1 },
  ],
  warnings: [],
});

const read = (buffer) => XLSX.read(buffer, { type: 'array' });
const rows = (workbook, name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' });

describe('exportSchedule', () => {
  it('names the file by month', () => {
    expect(scheduleFileName(config)).toBe('cuadro_turnos_2026-02.xlsx');
  });

  it('writes Cuadro, Detalle and Reporte sheets', () => {
    const workbook = read(buildScheduleWorkbook(result(), config, people));
    expect(workbook.SheetNames).toEqual(['Cuadro', 'Detalle', 'Reporte']);

    const grid = rows(workbook, 'Cuadro');
    expect(grid[0]).toHaveLength(29);
    expect(grid[0].slice(0, 3)).toEqual(['Persona', '1 dom', '2 lun']);
    expect(grid[1].slice(0, 3)).toEqual(['Ana', 'D 07:00-19:00', '']);
    expect(grid[2][1]).toBe('N 19:00-07:00');

    const detail = rows(workbook, 'Detalle');
    expect(detail[0]).toEqual(['Persona', 'Fecha', 'Turno', 'Inicio', 'Fin', 'Horas']);
    expect(detail).toHaveLength(3);
    expect(detail[1][0]).toBe('Ana');
    expect(serialToMinutes(detail[1][1])).toBe(toMinutes(2026, 2, 1));
    expect(detail[1][2]).toBe('Día');
    expect(serialToMinutes(detail[2][3])).toBe(toMinutes(2026, 2, 1, 1140));
    expect(serialToMinutes(detail[2][4])).toBe(toMinutes(2026, 2, 2, 420));
    expect(detail[2][5]).toBe(12);
    expect(workbook.Sheets.Detalle.D2.t).toBe('n');

    const report = rows(workbook, 'Reporte');
    expect(report[0]).toEqual(['Persona', 'Horas trabajadas', 'Meta', 'Diferencia', 'Turnos', 'Día', 'Noche', 'Fines de semana/festivos']);
    expect(report[1]).toEqual(['Ana', 12, 168, -156, 1, 1, 0, 1]);
    expect(report[3]).toEqual(['Total', 24, 336, -312, 2, 1, 1, 2]);
  });

  it('adds Sin cubrir only when there are uncovered seats', () => {
    const workbook = read(
      buildScheduleWorkbook(result([{ slotId: '2026-02-02|d', date: '2026-02-02', shiftId: 'd', required: 1, assigned: 0 }]), config, people),
    );
    expect(workbook.SheetNames).toContain('Sin cubrir');
    expect(rows(workbook, 'Sin cubrir')).toEqual([
      ['Fecha', 'Turno', 'Requeridas', 'Asignadas'],
      ['2026-02-02', 'Día', 1, 0],
    ]);
  });
});
