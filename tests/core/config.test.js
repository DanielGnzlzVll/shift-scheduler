import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_CONSECUTIVE, UNLIMITED_CONSECUTIVE, defaultConfig, newShiftId, normalizeConfig, validateConfig } from '../../src/core/config.js';

const fields = (config) => validateConfig(config).errors.map((e) => e.field);

describe('defaultConfig', () => {
  it('targets the next calendar month', () => {
    const config = defaultConfig(new Date(2026, 8, 25));
    expect([config.year, config.month]).toEqual([2026, 10]);
    expect(defaultConfig(new Date(2026, 11, 5))).toMatchObject({ year: 2027, month: 1 });
  });

  it('has a valid day/night setup', () => {
    const config = defaultConfig(new Date(2026, 8, 25));
    expect(config.shifts.map((s) => [s.name, s.code, s.start, s.end, s.requiredWeekday, s.requiredWeekend, s.maxConsecutive])).toEqual([
      ['Día', 'D', '07:00', '19:00', 2, 2, -1],
      ['Noche', 'N', '19:00', '07:00', 1, 1, 3],
    ]);
    expect(DEFAULT_MAX_CONSECUTIVE).toBe(3);
    expect(UNLIMITED_CONSECUTIVE).toBe(-1);
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

  it('requires a per-shift consecutive limit of -1 or between 1 and 31', () => {
    for (const value of [0, -2, 32, 1.5, undefined, '3']) {
      const config = base();
      config.shifts[1].maxConsecutive = value;
      expect(fields(config)).toContain('shifts.1.maxConsecutive');
    }
    const config = base();
    config.shifts[1].maxConsecutive = 31;
    expect(fields(config)).not.toContain('shifts.1.maxConsecutive');
    config.shifts[1].maxConsecutive = -1;
    expect(fields(config)).not.toContain('shifts.1.maxConsecutive');
    config.shifts[1].maxConsecutive = 0;
    expect(validateConfig(config).errors.find((e) => e.field === 'shifts.1.maxConsecutive').message).toBe(
      'Debe ser -1 (sin límite) o un entero entre 1 y 31',
    );
  });

  it('returns Spanish messages', () => {
    const { errors } = validateConfig({ ...base(), shifts: [] });
    expect(errors[0].message).toBe('Debe haber al menos un turno');
  });
});

describe('normalizeConfig', () => {
  it('fills the default consecutive limit for shifts saved without it', () => {
    const legacy = defaultConfig(new Date(2026, 8, 25));
    for (const shift of legacy.shifts) delete shift.maxConsecutive;
    legacy.shifts[1].maxConsecutive = 2;
    const normalized = normalizeConfig(legacy);
    expect(normalized.shifts.map((s) => s.maxConsecutive)).toEqual([3, 2]);
    expect(legacy.shifts[0].maxConsecutive).toBeUndefined();
    expect(validateConfig(normalized).valid).toBe(true);
  });

  it('leaves non-config values untouched', () => {
    expect(normalizeConfig(null)).toBeNull();
    expect(normalizeConfig({ shifts: 'x' })).toEqual({ shifts: 'x' });
  });
});

describe('newShiftId', () => {
  it('creates distinct ids', () => {
    expect(newShiftId()).not.toBe(newShiftId());
  });
});
