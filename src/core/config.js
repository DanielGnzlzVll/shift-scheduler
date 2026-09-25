import { parseHHMM } from './time.js';

export const DEFAULT_MAX_CONSECUTIVE = 3;
export const UNLIMITED_CONSECUTIVE = -1;

export function newShiftId() {
  return `s${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultConfig(today = new Date()) {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    shifts: [
      { id: 's1', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 2, requiredWeekend: 2, maxConsecutive: UNLIMITED_CONSECUTIVE },
      { id: 's2', name: 'Noche', code: 'N', start: '19:00', end: '07:00', requiredWeekday: 1, requiredWeekend: 1, maxConsecutive: DEFAULT_MAX_CONSECUTIVE },
    ],
    weeklyHours: 42,
    minRestHours: 12,
    maxConsecutiveDays: 6,
    allowOvertime: true,
  };
}

export function normalizeConfig(config) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.shifts)) return config;
  const rest = { ...config };
  delete rest.holidays;
  return {
    ...rest,
    shifts: config.shifts.map((shift) =>
      shift && typeof shift === 'object' && shift.maxConsecutive === undefined ? { ...shift, maxConsecutive: DEFAULT_MAX_CONSECUTIVE } : shift,
    ),
  };
}

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export function validateConfig(config) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: [{ field: '', message: 'Configuración inválida' }] };
  }

  if (!isInt(config.year, 2000, 2100)) add('year', 'Año inválido');
  if (!isInt(config.month, 1, 12)) add('month', 'Mes inválido');

  const shifts = Array.isArray(config.shifts) ? config.shifts : [];
  if (shifts.length === 0) add('shifts', 'Debe haber al menos un turno');
  const ids = new Set();
  const names = new Set();
  const codes = new Set();
  shifts.forEach((shift, i) => {
    const path = `shifts.${i}`;
    const id = String(shift?.id ?? '');
    const name = String(shift?.name ?? '').trim();
    const code = String(shift?.code ?? '').trim();
    if (!id || ids.has(id)) add(`${path}.id`, 'Identificador de turno inválido');
    ids.add(id);
    if (!name) add(`${path}.name`, 'El nombre es obligatorio');
    else if (names.has(name.toLowerCase())) add(`${path}.name`, 'Nombre repetido');
    names.add(name.toLowerCase());
    if (code.length < 1 || code.length > 3) add(`${path}.code`, 'El código debe tener de 1 a 3 caracteres');
    else if (codes.has(code.toUpperCase())) add(`${path}.code`, 'Código repetido');
    codes.add(code.toUpperCase());
    if (parseHHMM(shift?.start) === null) add(`${path}.start`, 'Hora inválida (HH:mm)');
    if (parseHHMM(shift?.end) === null) add(`${path}.end`, 'Hora inválida (HH:mm)');
    if (!isInt(shift?.requiredWeekday, 0, 1000)) add(`${path}.requiredWeekday`, 'Debe ser un entero mayor o igual a 0');
    if (!isInt(shift?.requiredWeekend, 0, 1000)) add(`${path}.requiredWeekend`, 'Debe ser un entero mayor o igual a 0');
    if (shift?.maxConsecutive !== UNLIMITED_CONSECUTIVE && !isInt(shift?.maxConsecutive, 1, 31)) {
      add(`${path}.maxConsecutive`, 'Debe ser -1 (sin límite) o un entero entre 1 y 31');
    }
  });

  if (!isNum(config.weeklyHours, 1, 84)) add('weeklyHours', 'Las horas semanales deben estar entre 1 y 84');
  if (!isNum(config.minRestHours, 0, 48)) add('minRestHours', 'El descanso mínimo debe estar entre 0 y 48 horas');
  if (!isInt(config.maxConsecutiveDays, 1, 31)) add('maxConsecutiveDays', 'Los días seguidos deben estar entre 1 y 31');
  if (typeof config.allowOvertime !== 'boolean') add('allowOvertime', 'Valor inválido');

  return { valid: errors.length === 0, errors };
}
