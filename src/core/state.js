import { UNLIMITED_CONSECUTIVE } from './config.js';

export function createState(people, exceptions, targets, config) {
  const byPerson = {};
  const minutes = {};
  const weekend = {};
  const shiftCounts = {};
  const shiftLimits = {};
  for (const shift of config.shifts) {
    shiftCounts[shift.id] = {};
    shiftLimits[shift.id] = shift.maxConsecutive === undefined || shift.maxConsecutive === UNLIMITED_CONSECUTIVE ? Infinity : shift.maxConsecutive;
  }
  for (const person of people) {
    byPerson[person] = [];
    minutes[person] = 0;
    weekend[person] = 0;
    for (const shift of config.shifts) shiftCounts[shift.id][person] = 0;
  }
  return { people, config, exceptions, targets, byPerson, minutes, weekend, shiftCounts, shiftLimits, seats: {} };
}

export function addAssignment(state, person, slot) {
  state.byPerson[person].push({
    slotId: slot.id,
    date: slot.date,
    day: slot.day,
    start: slot.start,
    end: slot.end,
    minutes: slot.minutes,
    shiftId: slot.shiftId,
    isWeekend: slot.isWeekend,
  });
  state.minutes[person] += slot.minutes;
  state.shiftCounts[slot.shiftId][person] += 1;
  if (slot.isWeekend) state.weekend[person] += 1;
  (state.seats[slot.id] ??= []).push(person);
}

export function removeAssignment(state, person, slot) {
  const list = state.byPerson[person];
  const index = list.findIndex((a) => a.slotId === slot.id);
  if (index === -1) return;
  list.splice(index, 1);
  state.minutes[person] -= slot.minutes;
  state.shiftCounts[slot.shiftId][person] -= 1;
  if (slot.isWeekend) state.weekend[person] -= 1;
  state.seats[slot.id] = state.seats[slot.id].filter((p) => p !== person);
}

export function deviation(state, person) {
  return state.minutes[person] / 60 - state.targets[person];
}
