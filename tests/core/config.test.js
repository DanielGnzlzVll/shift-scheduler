import { describe, expect, it } from 'vitest';
import { defaultConfig, newShiftId, validateConfig } from '../../src/core/config.js';

const fields = (config) => validateConfig(config).errors.map((e) => e.field);

describe('defaultConfig', () => {
  it('targets the next calendar month', () => {
    const config = defaultConfig(new Date(2026, 8, 25));
    expect([config.year, config.month]).toEqual([2026, 10]);
    expect(defaultConfig(new Date(2026, 11, 5))).toMatchObject({ year: 2027, month: 1 });
  });

  it('has a valid day/night setup', () => {
    const config = defaultConfig(new Date(2026, 8, 25));
    expect(config.shifts.map((s) => [s.name, s.code, s.start, s.end, s.requiredWeekday, s.requiredWeekend])).toEqual([
      ['Día', 'D', '07:00', '19:00', 2, 2],
      ['Noche', 'N', '19:00', '07:00', 1, 1],
    ]);
    expect(config).toMatchObject({
      holidays: [],
      weeklyHours: 42,
      minRestHours: 12,
      maxConsecutiveDays: 6,
      allowOvertime: true,
    });
    expect(validateConfig(config)).toEqual({ valid: true, errors: [] });
  });
});

describe('validateConfig', () => {
  const base = () => defaultConfig(new Date(2026, 8, 25));

  it('requires at least one shift', () => {
    expect(fields({ ...base(), shifts: [] })).toContain('shifts');
  });

  it('rejects duplicate names and codes', () => {
    const config = base();
    config.shifts[1].name = 'día';
    config.shifts[1].code = 'd';
    expect(fields(config)).toEqual(expect.arrayContaining(['shifts.1.name', 'shifts.1.code']));
  });

  it('rejects bad codes, times and staffing', () => {
    const config = base();
    config.shifts[0].code = 'ABCD';
    config.shifts[0].start = '25:00';
    config.shifts[0].end = '';
    config.shifts[0].requiredWeekday = -1;
    config.shifts[0].requiredWeekend = 1.5;
    expect(fields(config)).toEqual(
      expect.arrayContaining([
        'shifts.0.code',
        'shifts.0.start',
        'shifts.0.end',
        'shifts.0.requiredWeekday',
        'shifts.0.requiredWeekend',
      ]),
    );
  });

  it('rejects holidays outside the selected month', () => {
    expect(fields({ ...base(), holidays: ['2026-11-01'] })).toContain('holidays');
    expect(fields({ ...base(), holidays: ['2026-10-32'] })).toContain('holidays');
    expect(fields({ ...base(), holidays: ['2026-10-12'] })).not.toContain('holidays');
  });

  it('checks numeric rule ranges', () => {
    const config = { ...base(), weeklyHours: 0, minRestHours: 49, maxConsecutiveDays: 0, allowOvertime: 'yes', month: 13 };
    expect(fields(config)).toEqual(
      expect.arrayContaining(['weeklyHours', 'minRestHours', 'maxConsecutiveDays', 'allowOvertime', 'month']),
    );
  });

  it('returns Spanish messages', () => {
    const { errors } = validateConfig({ ...base(), shifts: [] });
    expect(errors[0].message).toBe('Debe haber al menos un turno');
  });
});

describe('newShiftId', () => {
  it('creates distinct ids', () => {
    expect(newShiftId()).not.toBe(newShiftId());
  });
});
