import { describe, expect, it } from 'vitest';
import { computeTargets, groupExceptions } from '../../src/core/targets.js';
import { toMinutes } from '../../src/core/time.js';

const feb = { year: 2026, month: 2, weeklyHours: 42 };
const ex = (person, d1, d2, m1 = 1, m2 = 2) => ({
  person,
  start: toMinutes(2026, m1, d1),
  end: toMinutes(2026, m2, d2),
});

describe('groupExceptions', () => {
  it('groups by person and merges overlaps', () => {
    const grouped = groupExceptions([ex('Ana', 1, 7, 2, 2), ex('Ana', 5, 10, 2, 2), ex('Luis', 3, 4, 2, 2)]);
    expect(grouped.Ana).toEqual([{ start: toMinutes(2026, 2, 1), end: toMinutes(2026, 2, 10) }]);
    expect(grouped.Luis).toHaveLength(1);
  });
});

describe('computeTargets', () => {
  it('uses weeklyHours × days / 7 without exceptions', () => {
    expect(computeTargets(['Ana'], {}, feb)).toEqual({ Ana: 168 });
  });

  it('prorates by blocked time', () => {
    const grouped = groupExceptions([ex('Ana', 1, 8, 2, 2)]);
    expect(computeTargets(['Ana'], grouped, feb).Ana).toBeCloseTo(126, 6);
  });

  it('merges overlapping exceptions before prorating', () => {
    const grouped = groupExceptions([ex('Ana', 1, 8, 2, 2), ex('Ana', 5, 11, 2, 2)]);
    expect(computeTargets(['Ana'], grouped, feb).Ana).toBeCloseTo(108, 6);
  });

  it('clips exceptions to the month', () => {
    const grouped = groupExceptions([ex('Ana', 25, 3, 1, 2), ex('Ana', 1, 10, 3, 3)]);
    expect(computeTargets(['Ana'], grouped, feb).Ana).toBeCloseTo(156, 6);
  });

  it('whole-month exception gives zero target', () => {
    const grouped = groupExceptions([ex('Ana', 20, 5, 1, 3)]);
    expect(computeTargets(['Ana', 'Luis'], grouped, feb)).toEqual({ Ana: 0, Luis: 168 });
  });
});
