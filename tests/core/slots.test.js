import { describe, expect, it } from 'vitest';
import { buildSlots, shiftMinutes } from '../../src/core/slots.js';
import { toMinutes } from '../../src/core/time.js';

const config = (overrides = {}) => ({
  year: 2026,
  month: 10,
  shifts: [
    { id: 'd', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 2, requiredWeekend: 3 },
    { id: 'n', name: 'Noche', code: 'N', start: '19:00', end: '07:00', requiredWeekday: 1, requiredWeekend: 1 },
  ],
  holidays: [],
  weeklyHours: 42,
  minRestHours: 12,
  maxConsecutiveDays: 6,
  allowOvertime: true,
  ...overrides,
});

describe('shiftMinutes', () => {
  it('derives durations including overnight and 24h', () => {
    expect(shiftMinutes({ start: '07:00', end: '19:00' })).toBe(720);
    expect(shiftMinutes({ start: '19:00', end: '07:00' })).toBe(720);
    expect(shiftMinutes({ start: '00:00', end: '00:00' })).toBe(1440);
  });
});

describe('buildSlots', () => {
  it('creates one slot per shift per day in chronological order', () => {
    const slots = buildSlots(config());
    expect(slots).toHaveLength(62);
    expect(slots.slice(0, 3).map((s) => s.id)).toEqual(['2026-10-01|d', '2026-10-01|n', '2026-10-02|d']);
    expect(slots[0]).toEqual({
      id: '2026-10-01|d',
      date: '2026-10-01',
      day: 1,
      shiftId: 'd',
      shiftIndex: 0,
      start: toMinutes(2026, 10, 1, 420),
      end: toMinutes(2026, 10, 1, 1140),
      minutes: 720,
      isWeekend: false,
      required: 2,
    });
  });

  it('uses weekend staffing on weekends and holidays', () => {
    const slots = buildSlots(config({ holidays: ['2026-10-12'] }));
    const find = (id) => slots.find((s) => s.id === id);
    expect(find('2026-10-03|d')).toMatchObject({ isWeekend: true, required: 3 });
    expect(find('2026-10-05|d')).toMatchObject({ isWeekend: false, required: 2 });
    expect(find('2026-10-12|d')).toMatchObject({ isWeekend: true, required: 3 });
  });

  it('lets a night shift on the last day end next month', () => {
    const last = buildSlots(config()).at(-1);
    expect(last.id).toBe('2026-10-31|n');
    expect(last.end).toBe(toMinutes(2026, 11, 1, 420));
  });

  it('omits slots with zero required people', () => {
    const c = config();
    c.shifts[1].requiredWeekday = 0;
    const slots = buildSlots(c);
    expect(slots.find((s) => s.id === '2026-10-05|n')).toBeUndefined();
    expect(slots.find((s) => s.id === '2026-10-04|n')).toBeDefined();
  });

  it('supports 24h shifts', () => {
    const slots = buildSlots(
      config({
        shifts: [{ id: 'f', name: 'Completo', code: 'C', start: '00:00', end: '00:00', requiredWeekday: 1, requiredWeekend: 1 }],
      }),
    );
    expect(slots[0].minutes).toBe(1440);
    expect(slots[0].end).toBe(slots[1].start);
  });
});
