import { overlaps } from './time.js';

export function canAssign(state, person, slot, ignoreSlotId = null) {
  const { minRestHours, maxConsecutiveDays, allowOvertime } = state.config;
  const rest = minRestHours * 60;
  const workedDays = new Set();
  let minutes = 0;

  for (const a of state.byPerson[person]) {
    if (a.slotId === ignoreSlotId) continue;
    if (a.date === slot.date) return false;
    if (overlaps(a.start, a.end, slot.start, slot.end)) return false;
    if (a.end <= slot.start && slot.start - a.end < rest) return false;
    if (slot.end <= a.start && a.start - slot.end < rest) return false;
    workedDays.add(a.day);
    minutes += a.minutes;
  }

  for (const interval of state.exceptions[person] ?? []) {
    if (overlaps(interval.start, interval.end, slot.start, slot.end)) return false;
  }

  let run = 1;
  for (let d = slot.day - 1; workedDays.has(d); d--) run++;
  for (let d = slot.day + 1; workedDays.has(d); d++) run++;
  if (run > maxConsecutiveDays) return false;

  if (!allowOvertime && minutes + slot.minutes > state.targets[person] * 60 + 1e-6) return false;

  return true;
}
