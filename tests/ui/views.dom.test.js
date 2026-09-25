import { describe, expect, it } from 'vitest';
import { toMinutes } from '../../src/core/time.js';
import { renderScheduleGrid } from '../../src/ui/scheduleGrid.js';
import { renderReportTable } from '../../src/ui/reportTable.js';
import { renderWarnings } from '../../src/ui/warnings.js';

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
const result = {
  seed: 1,
  assignments: [
    { person: 'Ana', slotId: '2026-02-01|d', date: '2026-02-01', shiftId: 'd', start: toMinutes(2026, 2, 1, 420), end: toMinutes(2026, 2, 1, 1140), hours: 12 },
  ],
  uncovered: [],
  report: [
    { person: 'Ana', hours: 12, target: 168, diff: -156, shifts: 1, byShift: { d: 1, n: 0 }, weekendShifts: 1 },
    { person: 'Luis', hours: 180, target: 168, diff: 12, shifts: 15, byShift: { d: 0, n: 15 }, weekendShifts: 4 },
  ],
  warnings: [],
};
const exceptions = [{ person: 'Luis', start: toMinutes(2026, 2, 3), end: toMinutes(2026, 2, 4) }];

describe('renderScheduleGrid', () => {
  it('renders people, shift cells, exceptions and coverage', () => {
    const container = document.createElement('div');
    renderScheduleGrid(container, { result, config, people, exceptions });
    const table = container.querySelector('table.schedule');
    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(4);
    expect(table.querySelectorAll('thead th')).toHaveLength(29);
    expect(table.querySelector('thead th.weekend').textContent).toBe('1dom');

    const anaCells = bodyRows[0].querySelectorAll('td');
    expect(anaCells[0].textContent).toBe('D 07–19');
    expect(anaCells[0].className).toContain('shift-0');
    expect(bodyRows[1].querySelectorAll('td')[2].textContent).toBe('X');
    expect(bodyRows[1].querySelectorAll('td')[2].className).toContain('blocked');

    const coverageDay = bodyRows[2].querySelectorAll('td');
    expect(coverageDay[0].textContent).toBe('1/1');
    expect(coverageDay[1].textContent).toBe('0/1');
    expect(coverageDay[1].className).toContain('short');
  });
});

describe('renderReportTable', () => {
  it('renders rows, signed differences and totals', () => {
    const container = document.createElement('div');
    renderReportTable(container, result.report, config.shifts);
    const rows = container.querySelectorAll('table.report tbody tr');
    expect(rows).toHaveLength(2);
    expect([...rows[0].children].map((c) => c.textContent)).toEqual(['Ana', '12.0', '168.0', '-156.0', '1', '1', '0', '1']);
    expect(rows[0].children[3].className).toBe('neg');
    expect(rows[1].children[3].textContent).toBe('+12.0');
    expect(rows[1].children[3].className).toBe('pos');
    expect([...container.querySelector('table.report tfoot tr').children].map((c) => c.textContent)).toEqual([
      'Total', '192.0', '336.0', '-144.0', '16', '1', '15', '5',
    ]);
  });
});

describe('renderWarnings', () => {
  it('shows an ok message when empty and a list otherwise', () => {
    const container = document.createElement('div');
    renderWarnings(container, []);
    expect(container.textContent).toBe('Sin advertencias: todos los turnos quedaron cubiertos.');
    renderWarnings(container, ['Noche del 14: 1 de 2 personas']);
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Noche del 14: 1 de 2 personas']);
  });
});
