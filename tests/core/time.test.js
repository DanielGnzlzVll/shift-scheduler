import { describe, expect, it } from 'vitest';
import {
  DAY_MINUTES,
  clipInterval,
  formatDateTime,
  formatHHMM,
  fromMinutes,
  mergeIntervals,
  overlaps,
  parseHHMM,
  shiftDuration,
  toMinutes,
} from '../../src/core/time.js';

describe('parseHHMM', () => {
  it('parses valid times', () => {
    expect(parseHHMM('07:00')).toBe(420);
    expect(parseHHMM('7:05')).toBe(425);
    expect(parseHHMM(' 23:59 ')).toBe(1439);
  });

  it('rejects invalid times', () => {
    for (const value of ['24:00', '12:60', '7', 'abc', '', null, undefined]) {
      expect(parseHHMM(value)).toBeNull();
    }
  });
});

describe('formatHHMM', () => {
  it('pads and wraps around the day', () => {
    expect(formatHHMM(420)).toBe('07:00');
    expect(formatHHMM(DAY_MINUTES + 65)).toBe('01:05');
  });
});

describe('shiftDuration', () => {
  it('handles same-day, overnight and 24h shifts', () => {
    expect(shiftDuration(420, 1140)).toBe(720);
    expect(shiftDuration(1140, 420)).toBe(720);
    expect(shiftDuration(0, 0)).toBe(DAY_MINUTES);
  });
});

describe('toMinutes / fromMinutes', () => {
  it('round-trips naive wall-clock time', () => {
    const m = toMinutes(2026, 3, 8, 150);
    expect(fromMinutes(m)).toEqual({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 });
    expect(formatDateTime(m)).toBe('2026-03-08 02:30');
  });

  it('overflows days into the next month', () => {
    expect(toMinutes(2026, 1, 32)).toBe(toMinutes(2026, 2, 1));
  });
});

describe('intervals', () => {
  it('uses half-open overlap semantics', () => {
    expect(overlaps(0, 10, 10, 20)).toBe(false);
    expect(overlaps(0, 11, 10, 20)).toBe(true);
  });

  it('merges overlapping and touching intervals', () => {
    expect(
      mergeIntervals([
        { start: 10, end: 20 },
        { start: 0, end: 5 },
        { start: 5, end: 12 },
        { start: 30, end: 40 },
      ]),
    ).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 40 },
    ]);
  });

  it('clips to a window', () => {
    expect(clipInterval({ start: 0, end: 100 }, 50, 200)).toEqual({ start: 50, end: 100 });
    expect(clipInterval({ start: 0, end: 10 }, 10, 20)).toBeNull();
  });
});
