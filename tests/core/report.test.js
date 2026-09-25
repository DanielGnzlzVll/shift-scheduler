import { describe, expect, it } from 'vitest';
import { buildReport } from '../../src/core/report.js';
import { addAssignment, createState } from '../../src/core/state.js';

describe('buildReport', () => {
  it('summarizes hours, target and counts per person', () => {
    const state = createState(['Ana', 'Luis'], {}, { Ana: 20, Luis: 20 }, { shifts: [{ id: 'd' }, { id: 'n' }] });
    addAssignment(state, 'Ana', { id: 'x|d', date: 'x', day: 1, shiftId: 'd', start: 0, end: 720, minutes: 720, isWeekend: true });
    addAssignment(state, 'Ana', { id: 'y|n', date: 'y', day: 3, shiftId: 'n', start: 5000, end: 5720, minutes: 720, isWeekend: false });
    expect(buildReport(state)).toEqual([
      { person: 'Ana', hours: 24, target: 20, diff: 4, shifts: 2, byShift: { d: 1, n: 1 }, weekendShifts: 1 },
      { person: 'Luis', hours: 0, target: 20, diff: -20, shifts: 0, byShift: { d: 0, n: 0 }, weekendShifts: 0 },
    ]);
  });
});
