import * as XLSX from 'xlsx';
import { WEEKDAY_SHORT, dateKey, daysInMonth, weekday } from '../core/calendar.js';
import { toMinutes } from '../core/time.js';
import { minutesToSerial } from './excelDates.js';

const round1 = (n) => Math.round(n * 10) / 10;

export function scheduleFileName(config) {
  return `cuadro_turnos_${config.year}-${String(config.month).padStart(2, '0')}.xlsx`;
}

function setColumnFormat(sheet, column, count, format) {
  for (let r = 1; r <= count; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: column })];
    if (cell) cell.z = format;
  }
}

export function buildScheduleWorkbook(result, config, people) {
  const { year, month, shifts } = config;
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const byCell = new Map(result.assignments.map((a) => [`${a.person}|${a.date}`, a]));
  const workbook = XLSX.utils.book_new();

  const gridHeader = ['Persona', ...days.map((d) => `${d} ${WEEKDAY_SHORT[weekday(year, month, d)]}`)];
  const gridRows = people.map((person) => [
    person,
    ...days.map((d) => {
      const assignment = byCell.get(`${person}|${dateKey(year, month, d)}`);
      if (!assignment) return '';
      const shift = shiftById.get(assignment.shiftId);
      return `${shift.code} ${shift.start}-${shift.end}`;
    }),
  ]);
  const grid = XLSX.utils.aoa_to_sheet([gridHeader, ...gridRows]);
  grid['!cols'] = [{ wch: 24 }, ...days.map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(workbook, grid, 'Cuadro');

  const detailRows = result.assignments.map((a) => {
    const [y, m, d] = a.date.split('-').map(Number);
    return [a.person, minutesToSerial(toMinutes(y, m, d)), shiftById.get(a.shiftId).name, minutesToSerial(a.start), minutesToSerial(a.end), a.hours];
  });
  const detail = XLSX.utils.aoa_to_sheet([['Persona', 'Fecha', 'Turno', 'Inicio', 'Fin', 'Horas'], ...detailRows]);
  setColumnFormat(detail, 1, detailRows.length, 'yyyy-mm-dd');
  setColumnFormat(detail, 3, detailRows.length, 'yyyy-mm-dd hh:mm');
  setColumnFormat(detail, 4, detailRows.length, 'yyyy-mm-dd hh:mm');
  detail['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 17 }, { wch: 17 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(workbook, detail, 'Detalle');

  const reportHeader = ['Persona', 'Horas trabajadas', 'Meta', 'Diferencia', 'Turnos', ...shifts.map((s) => s.name), 'Fines de semana/festivos'];
  const reportRows = result.report.map((r) => [
    r.person,
    round1(r.hours),
    round1(r.target),
    round1(r.diff),
    r.shifts,
    ...shifts.map((s) => r.byShift[s.id] ?? 0),
    r.weekendShifts,
  ]);
  const totals = ['Total', ...reportHeader.slice(1).map((_, i) => round1(reportRows.reduce((sum, row) => sum + row[i + 1], 0)))];
  const report = XLSX.utils.aoa_to_sheet([reportHeader, ...reportRows, totals]);
  report['!cols'] = reportHeader.map((h, i) => ({ wch: i === 0 ? 24 : Math.max(10, h.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, report, 'Reporte');

  if (result.uncovered.length) {
    const uncovered = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Turno', 'Requeridas', 'Asignadas'],
      ...result.uncovered.map((u) => [u.date, shiftById.get(u.shiftId).name, u.required, u.assigned]),
    ]);
    XLSX.utils.book_append_sheet(workbook, uncovered, 'Sin cubrir');
  }

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}
