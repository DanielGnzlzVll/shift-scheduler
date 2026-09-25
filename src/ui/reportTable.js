import { el } from './dom.js';

const fmt = (n) => n.toFixed(1);

const diffCell = (diff) =>
  el('td', { className: diff > 0.05 ? 'pos' : diff < -0.05 ? 'neg' : '' }, `${diff > 0.05 ? '+' : ''}${fmt(diff)}`);

export function renderReportTable(container, report, shifts) {
  const sum = (pick) => report.reduce((total, row) => total + pick(row), 0);
  const header = el(
    'tr',
    {},
    ['Persona', 'Horas', 'Meta', 'Diferencia', 'Turnos', ...shifts.map((s) => s.name), 'Fines de semana/festivos'].map((h) => el('th', {}, h)),
  );
  const rows = report.map((r) =>
    el(
      'tr',
      {},
      el('th', {}, r.person),
      el('td', {}, fmt(r.hours)),
      el('td', {}, fmt(r.target)),
      diffCell(r.diff),
      el('td', {}, String(r.shifts)),
      shifts.map((s) => el('td', {}, String(r.byShift[s.id] ?? 0))),
      el('td', {}, String(r.weekendShifts)),
    ),
  );
  const totals = el(
    'tr',
    { className: 'total' },
    el('th', {}, 'Total'),
    el('td', {}, fmt(sum((r) => r.hours))),
    el('td', {}, fmt(sum((r) => r.target))),
    diffCell(sum((r) => r.diff)),
    el('td', {}, String(sum((r) => r.shifts))),
    shifts.map((s) => el('td', {}, String(sum((r) => r.byShift[s.id] ?? 0)))),
    el('td', {}, String(sum((r) => r.weekendShifts))),
  );
  container.replaceChildren(
    el('h3', {}, 'Reporte de horas'),
    el('table', { className: 'report' }, el('thead', {}, header), el('tbody', {}, rows), el('tfoot', {}, totals)),
  );
}
