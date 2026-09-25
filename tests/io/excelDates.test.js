import { describe, expect, it } from 'vitest';
import { minutesToSerial, serialToMinutes } from '../../src/io/excelDates.js';
import { toMinutes } from '../../src/core/time.js';

describe('excel serial dates', () => {
  it('maps the Unix epoch to serial 25569', () => {
    expect(minutesToSerial(toMinutes(1970, 1, 1))).toBe(25569);
  });

  it('round-trips datetimes to the minute', () => {
    const m = toMinutes(2026, 10, 5, 7 * 60 + 30);
    expect(serialToMinutes(minutesToSerial(m))).toBe(m);
  });
});
