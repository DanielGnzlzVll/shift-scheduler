import { dateKey, daysInMonth, isWeekend } from './calendar.js';
import { parseHHMM, shiftDuration, toMinutes } from './time.js';

export function shiftMinutes(shift) {
  return shiftDuration(parseHHMM(shift.start), parseHHMM(shift.end));
}

export function buildSlots(config) {
  const { year, month, shifts, holidays = [] } = config;
  const slots = [];
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const weekend = isWeekend(year, month, day, holidays);
    const date = dateKey(year, month, day);
    shifts.forEach((shift, shiftIndex) => {
      const required = weekend ? shift.requiredWeekend : shift.requiredWeekday;
      if (required <= 0) return;
      const minutes = shiftMinutes(shift);
      const start = toMinutes(year, month, day, parseHHMM(shift.start));
      slots.push({
        id: `${date}|${shift.id}`,
        date,
        day,
        shiftId: shift.id,
        shiftIndex,
        start,
        end: start + minutes,
        minutes,
        isWeekend: weekend,
        required,
      });
    });
  }
  return slots.sort((a, b) => a.start - b.start || a.shiftIndex - b.shiftIndex);
}
