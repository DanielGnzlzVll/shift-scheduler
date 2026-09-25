import { describe, expect, it } from 'vitest';
import { defaultSeed, generateSchedule } from '../../src/core/scheduler.js';
import { toMinutes } from '../../src/core/time.js';

const dayNight = (overrides = {}) => ({
  year: 2026,
  month: 2,
  shifts: [
    { id: 'd', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 1, requiredWeekend: 1 },
    { id: 'n', name: 'Noche', code: 'N', start: '19:00', end: '07:00', requiredWeekday: 1, requiredWeekend: 1 },
  ],
  holidays: [],
  weeklyHours: 42,
  minRestHours: 12,
  maxConsecutiveDays: 6,
  allowOvertime: true,
  ...overrides,
});

const PEOPLE = ['Ana', 'Luis', 'Marta', 'Pedro'];

function assertHardRules(result, config, exceptions = []) {
  const perSlot = new Map();
  for (const a of result.assignments) perSlot.set(a.slotId, (perSlot.get(a.slotId) ?? 0) + 1);
  for (const [slotId, count] of perSlot) {
    const shiftId = slotId.split('|')[1];
    const shift = config.shifts.find((s) => s.id === shiftId);
    expect(count).toBeLessThanOrEqual(Math.max(shift.requiredWeekday, shift.requiredWeekend));
  }
  const byPerson = new Map();
  for (const a of result.assignments) {
    if (!byPerson.has(a.person)) byPerson.set(a.person, []);
    byPerson.get(a.person).push(a);
  }
  for (const [person, list] of byPerson) {
    list.sort((x, y) => x.start - y.start);
    expect(new Set(list.map((a) => a.date)).size).toBe(list.length);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].start - list[i - 1].end).toBeGreaterThanOrEqual(config.minRestHours * 60);
    }
    const days = list.map((a) => Number(a.date.slice(8, 10)));
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(config.maxConsecutiveDays);
    }
    let shiftRun = 1;
    for (let i = 1; i < list.length; i++) {
      shiftRun = days[i] === days[i - 1] + 1 && list[i].shiftId === list[i - 1].shiftId ? shiftRun + 1 : 1;
      const configured = config.shifts.find((s) => s.id === list[i].shiftId).maxConsecutive;
      const limit = configured === undefined || configured === -1 ? Infinity : configured;
      expect(shiftRun).toBeLessThanOrEqual(limit);
    }
    for (const e of exceptions.filter((x) => x.person === person)) {
      for (const a of list) expect(a.start < e.end && e.start < a.end).toBe(false);
    }
  }
}

describe('generateSchedule', () => {
  it('covers a feasible month and balances hours within one shift', () => {
    const config = dayNight();
    const result = generateSchedule({ people: PEOPLE, config });
    assertHardRules(result, config);
    expect(result.uncovered).toEqual([]);
    for (const row of result.report) expect(Math.abs(row.diff)).toBeLessThanOrEqual(12);
    expect(result.assignments).toHaveLength(56);
  });

  it('respects per-shift consecutive limits', () => {
    const config = dayNight();
    config.shifts[0].maxConsecutive = 2;
    config.shifts[1].maxConsecutive = 1;
    const result = generateSchedule({ people: [...PEOPLE, 'Sofía'], config });
    assertHardRules(result, config);
    expect(result.uncovered).toEqual([]);
    const nights = result.assignments.filter((a) => a.shiftId === 'n');
    for (const a of nights) {
      const next = new Date(`${a.date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const nextDate = next.toISOString().slice(0, 10);
      expect(nights.some((b) => b.person === a.person && b.date === nextDate)).toBe(false);
    }
  });

  it('is deterministic for a seed and uses defaultSeed', () => {
    const config = dayNight();
    const a = generateSchedule({ people: PEOPLE, config, seed: 99 });
    const b = generateSchedule({ people: PEOPLE, config, seed: 99 });
    expect(a).toEqual(b);
    expect(generateSchedule({ people: PEOPLE, config }).seed).toBe(defaultSeed(config));
    expect(defaultSeed(config)).toBe(202602);
    const other = generateSchedule({ people: PEOPLE, config, seed: 12345 });
    assertHardRules(other, config);
  });

  it('reports uncovered seats when infeasible', () => {
    const config = dayNight({
      shifts: [{ id: 'd', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 2, requiredWeekend: 2 }],
    });
    const result = generateSchedule({ people: ['Ana'], config });
    assertHardRules(result, config);
    expect(result.uncovered).toHaveLength(28);
    expect(result.uncovered[0]).toEqual({ slotId: '2026-02-01|d', date: '2026-02-01', shiftId: 'd', required: 2, assigned: 1 });
    expect(result.warnings[0]).toBe('Día del 1: 1 de 2 personas');
  });

  it('never exceeds targets when overtime is not allowed', () => {
    const config = dayNight({
      weeklyHours: 20,
      allowOvertime: false,
      shifts: [{ id: 'd', name: 'Día', code: 'D', start: '07:00', end: '19:00', requiredWeekday: 2, requiredWeekend: 2 }],
    });
    const result = generateSchedule({ people: ['Ana', 'Luis', 'Marta'], config });
    assertHardRules(result, config);
    for (const row of result.report) expect(row.hours).toBeLessThanOrEqual(row.target + 1e-9);
    expect(result.uncovered.length).toBeGreaterThan(0);
  });

  it('respects exceptions and prorates targets', () => {
    const config = dayNight();
    const exceptions = [{ person: 'Ana', start: toMinutes(2026, 2, 1), end: toMinutes(2026, 2, 15) }];
    const result = generateSchedule({ people: PEOPLE, exceptions, config });
    assertHardRules(result, config, exceptions);
    expect(result.report.find((r) => r.person === 'Ana').target).toBeCloseTo(84, 6);
  });

  it('fully blocked person gets no shifts', () => {
    const config = dayNight();
    const exceptions = [{ person: 'Ana', start: toMinutes(2026, 1, 20), end: toMinutes(2026, 3, 5) }];
    const result = generateSchedule({ people: [...PEOPLE, 'Sofía'], exceptions, config });
    expect(result.assignments.filter((a) => a.person === 'Ana')).toEqual([]);
    expect(result.report.find((r) => r.person === 'Ana')).toMatchObject({ target: 0, hours: 0 });
  });

  it('night shift on the last day belongs to the month', () => {
    const result = generateSchedule({ people: PEOPLE, config: dayNight() });
    const last = result.assignments.find((a) => a.slotId === '2026-02-28|n');
    expect(last).toMatchObject({ date: '2026-02-28', end: toMinutes(2026, 3, 1, 420), hours: 12 });
  });

  it('keeps report totals consistent with assignments', () => {
    const result = generateSchedule({ people: PEOPLE, config: dayNight() });
    expect(result.report.reduce((n, r) => n + r.shifts, 0)).toBe(result.assignments.length);
    for (const row of result.report) {
      expect(row.byShift.d + row.byShift.n).toBe(row.shifts);
    }
  });

  it('handles a large team quickly', () => {
    const people = Array.from({ length: 60 }, (_, i) => `Persona ${i + 1}`);
    const config = dayNight({
      month: 10,
      shifts: [
        { id: 'm', name: 'Mañana', code: 'M', start: '06:00', end: '14:00', requiredWeekday: 5, requiredWeekend: 4 },
        { id: 't', name: 'Tarde', code: 'T', start: '14:00', end: '22:00', requiredWeekday: 5, requiredWeekend: 4 },
        { id: 'n', name: 'Noche', code: 'N', start: '22:00', end: '06:00', requiredWeekday: 5, requiredWeekend: 4 },
      ],
    });
    const started = performance.now();
    const result = generateSchedule({ people, config });
    expect(performance.now() - started).toBeLessThan(3000);
    expect(result.uncovered).toEqual([]);
    assertHardRules(result, config);
  });

  it('schedules 100 people and 5 shifts at full capacity in under a second', () => {
    const people = Array.from({ length: 100 }, (_, i) => `Persona ${i + 1}`);
    const shift = (id, start, end, required) => ({ id, name: id, code: id.toUpperCase(), start, end, requiredWeekday: required, requiredWeekend: required });
    const config = dayNight({
      month: 10,
      shifts: [shift('a', '06:00', '13:00', 16), shift('b', '07:00', '16:00', 14), shift('c', '13:00', '21:00', 15), shift('d', '16:00', '22:00', 17), shift('e', '21:00', '06:00', 14)],
    });
    const started = performance.now();
    const result = generateSchedule({ people, config });
    const elapsed = performance.now() - started;
    expect(result.uncovered).toEqual([]);
    assertHardRules(result, config);
    expect(elapsed).toBeLessThan(1500);
  });
});
