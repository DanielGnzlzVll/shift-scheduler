import { toMinutes } from './time.js';

export const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const pad = (n) => String(n).padStart(2, '0');

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function weekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function dateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isWeekend(year, month, day, holidays = []) {
  const wd = weekday(year, month, day);
  return wd === 0 || wd === 6 || holidays.includes(dateKey(year, month, day));
}

export function monthRange(year, month) {
  return {
    start: toMinutes(year, month, 1),
    end: toMinutes(year, month, daysInMonth(year, month) + 1),
  };
}
