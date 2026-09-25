import { WEEKDAY_SHORT, dateKey, daysInMonth, isWeekend, weekday } from '../core/calendar.js';
import { groupExceptions } from '../core/targets.js';
import { DAY_MINUTES, formatDateTime, overlaps, toMinutes } from '../core/time.js';
import { el } from './dom.js';

export function renderScheduleGrid(container, { result, config, people, exceptions }) {
  const { year, month, shifts, holidays = [] } = config;
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const weekendDays = new Set(days.filter((d) => isWeekend(year, month, d, holidays)));
  const shiftIndex = new Map(shifts.map((s, i) => [s.id, i]));
  const byCell = new Map(result.assignments.map((a) => [`${a.person}|${a.date}`, a]));
  const coverage = new Map();
  for (const a of result.assignments) {
    const key = `${a.date}|${a.shiftId}`;
    coverage.set(key, (coverage.get(key) ?? 0) + 1);
  }
  const blocked = groupExceptions(exceptions);
  const dayClass = (d, extra = '') => [extra, weekendDays.has(d) ? 'weekend' : ''].filter(Boolean).join(' ');

  const header = el(
    'tr',
    {},
    el('th', {}, 'Persona'),
    days.map((d) => el('th', { className: dayClass(d) }, String(d), el('br'), WEEKDAY_SHORT[weekday(year, month, d)])),
  );

  const personRow = (person) =>
    el(
      'tr',
      {},
      el('th', {}, person),
      days.map((d) => {
        const assignment = byCell.get(`${person}|${dateKey(year, month, d)}`);
        if (assignment) {
          const index = shiftIndex.get(assignment.shiftId);
          const shift = shifts[index];
          return el(
            'td',
            { className: dayClass(d, `shift shift-${index % 6}`), title: `${shift.name} ${shift.start}–${shift.end}` },
            `${shift.code} ${shift.start.slice(0, 2)}–${shift.end.slice(0, 2)}`,
          );
        }
        const dayStart = toMinutes(year, month, d);
        const hit = (blocked[person] ?? []).find((iv) => overlaps(iv.start, iv.end, dayStart, dayStart + DAY_MINUTES));
        if (hit) {
          return el(
            'td',
            { className: dayClass(d, 'blocked'), title: `No disponible: ${formatDateTime(hit.start)} – ${formatDateTime(hit.end)}` },
            'X',
          );
        }
        return el('td', { className: dayClass(d) });
      }),
    );

  const coverageRow = (shift) =>
    el(
      'tr',
      { className: 'coverage' },
      el('th', {}, `Cobertura ${shift.code}`),
      days.map((d) => {
        const required = weekendDays.has(d) ? shift.requiredWeekend : shift.requiredWeekday;
        const assigned = coverage.get(`${dateKey(year, month, d)}|${shift.id}`) ?? 0;
        return el('td', { className: dayClass(d, assigned < required ? 'short' : '') }, `${assigned}/${required}`);
      }),
    );

  container.replaceChildren(
    el('h3', {}, 'Cuadro de turnos'),
    el(
      'div',
      { className: 'grid-scroll' },
      el('table', { className: 'schedule' }, el('thead', {}, header), el('tbody', {}, people.map(personRow), shifts.map(coverageRow))),
    ),
  );
}
