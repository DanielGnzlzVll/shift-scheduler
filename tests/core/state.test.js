import { describe, expect, it } from 'vitest';
import { addAssignment, createState, deviation, removeAssignment } from '../../src/core/state.js';

const config = { shifts: [{ id: 'd' }, { id: 'n' }] };
const slot = { id: '2026-02-01|d', date: '2026-02-01', day: 1, shiftId: 'd', start: 0, end: 720, minutes: 720, isWeekend: true };

describe('schedule state', () => {
  it('tracks minutes, counts, weekend and seats', () => {
    const state = createState(['Ana', 'Luis'], {}, { Ana: 24, Luis: 24 }, config);
    addAssignment(state, 'Ana', slot);
    expect(state.minutes.Ana).toBe(720);
    expect(state.shiftCounts.d.Ana).toBe(1);
    expect(state.shiftCounts.n.Ana).toBe(0);
    expect(state.weekend.Ana).toBe(1);
    expect(state.seats[slot.id]).toEqual(['Ana']);
    expect(state.byPerson.Ana[0]).toEqual({
      slotId: slot.id,
      date: slot.date,
      day: 1,
      start: 0,
      end: 720,
      minutes: 720,
      shiftId: 'd',
      isWeekend: true,
    });
    expect(deviation(state, 'Ana')).toBe(-12);

    removeAssignment(state, 'Ana', slot);
    expect(state.minutes.Ana).toBe(0);
    expect(state.shiftCounts.d.Ana).toBe(0);
    expect(state.weekend.Ana).toBe(0);
    expect(state.seats[slot.id]).toEqual([]);
    expect(state.byPerson.Ana).toEqual([]);
  });
});
