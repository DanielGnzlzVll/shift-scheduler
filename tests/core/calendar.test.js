import { describe, expect, it } from 'vitest';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  dateKey,
  daysInMonth,
  isWeekend,
  monthRange,
  weekday,
} from '../../src/core/calendar.js';
import { DAY_MINUTES } from '../../src/core/time.js';

describe('calendar', () => {
  it('knows month lengths including leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('computes weekdays', () => {
    expect(weekday(2026, 10, 3)).toBe(6);
    expect(weekday(2026, 10, 4)).toBe(0);
    expect(weekday(2026, 10, 5)).toBe(1);
    expect(WEEKDAY_SHORT[weekday(2026, 10, 5)]).toBe('lun');
  });

  it('detects weekends and holidays', () => {
    expect(isWeekend(2026, 10, 3)).toBe(true);
    expect(isWeekend(2026, 10, 5)).toBe(false);
    expect(isWeekend(2026, 10, 12, ['2026-10-12'])).toBe(true);
  });

  it('formats date keys', () => {
    expect(dateKey(2026, 1, 5)).toBe('2026-01-05');
  });

  it('returns the month range in minutes', () => {
    const { start, end } = monthRange(2026, 2);
    expect(end - start).toBe(28 * DAY_MINUTES);
  });

  it('names months in Spanish', () => {
    expect(MONTH_NAMES[0]).toBe('enero');
    expect(MONTH_NAMES[11]).toBe('diciembre');
  });
});
