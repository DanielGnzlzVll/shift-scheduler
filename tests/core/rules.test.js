import { describe, expect, it } from 'vitest';
import { canAssign } from '../../src/core/rules.js';
import { addAssignment, createState } from '../../src/core/state.js';
import { toMinutes } from '../../src/core/time.js';

const pad = (n) => String(n).padStart(2, '0');
const slot = (day, startHour, hours = 12, shiftId = startHour < 12 ? 'd' : 'n') => {
  const start = toMinutes(2026, 2, day, startHour * 60);
  return {
    id: `2026-02-${pad(day)}|${shiftId}`,
    date: `2026-02-${pad(day)}`,
    day,
    shiftId,
    shiftIndex: shiftId === 'd' ? 0 : 1,
    start,
    end: start + hours * 60,
    minutes: hours * 60,
    isWeekend: false,
    required: 1,
  };
};

const makeState = (rules = {}, exceptions = {}, targets = { Ana: 168 }) =>
  createState(['Ana'], exceptions, targets, {
    shifts: [{ id: 'd' }, { id: 'n' }],
    minRestHours: 12,
    maxConsecutiveDays: 3,
    allowOvertime: true,
    ...rules,
  });

describe('canAssign', () => {
  it('allows one shift per day', () => {
    const state = makeState();
    addAssignment(state, 'Ana', slot(1, 7));
    expect(canAssign(state, 'Ana', slot(1, 19))).toBe(false);
  });

  it('enforces minimum rest after a shift', () => {
    const state = makeState();
    addAssignment(state, 'Ana', slot(1, 19));
    expect(canAssign(state, 'Ana', slot(2, 7))).toBe(false);
    expect(canAssign(state, 'Ana', slot(2, 19))).toBe(true);
  });

  it('enforces minimum rest before a later shift', () => {
    const state = makeState();
    addAssignment(state, 'Ana', slot(3, 7));
    expect(canAssign(state, 'Ana', slot(2, 19))).toBe(false);
    expect(canAssign(state, 'Ana', slot(1, 19))).toBe(true);
  });

  it('respects exceptions including overnight overlap', () => {
    const state = makeState({}, { Ana: [{ start: toMinutes(2026, 2, 5), end: toMinutes(2026, 2, 6) }] });
    expect(canAssign(state, 'Ana', slot(5, 7))).toBe(false);
    expect(canAssign(state, 'Ana', slot(4, 19))).toBe(false);
    expect(canAssign(state, 'Ana', slot(6, 7))).toBe(true);
  });

  it('limits consecutive days', () => {
    const state = makeState();
    for (const day of [1, 2, 3]) addAssignment(state, 'Ana', slot(day, 7));
    expect(canAssign(state, 'Ana', slot(4, 7))).toBe(false);
    expect(canAssign(state, 'Ana', slot(5, 7))).toBe(true);
  });

  it('counts consecutive days on both sides of a gap', () => {
    const state = makeState();
    for (const day of [1, 2, 4, 5]) addAssignment(state, 'Ana', slot(day, 7));
    expect(canAssign(state, 'Ana', slot(3, 7))).toBe(false);
  });

  it('blocks overtime only when disallowed', () => {
    const state = makeState({ allowOvertime: false }, {}, { Ana: 24 });
    addAssignment(state, 'Ana', slot(1, 7));
    expect(canAssign(state, 'Ana', slot(3, 7))).toBe(true);
    addAssignment(state, 'Ana', slot(3, 7));
    expect(canAssign(state, 'Ana', slot(5, 7))).toBe(false);

    const free = makeState({ allowOvertime: true }, {}, { Ana: 24 });
    addAssignment(free, 'Ana', slot(1, 7));
    addAssignment(free, 'Ana', slot(3, 7));
    expect(canAssign(free, 'Ana', slot(5, 7))).toBe(true);
  });

  it('can ignore one existing assignment', () => {
    const state = makeState();
    const day1 = slot(1, 7);
    addAssignment(state, 'Ana', day1);
    expect(canAssign(state, 'Ana', slot(1, 19), day1.id)).toBe(true);
  });
});
