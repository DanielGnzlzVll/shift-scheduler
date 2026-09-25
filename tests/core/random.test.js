import { describe, expect, it } from 'vitest';
import { mulberry32, randomSeed } from '../../src/core/random.js';

describe('mulberry32', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in [0, 1) that differ across seeds', () => {
    const next = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('creates integer seeds', () => {
    expect(Number.isInteger(randomSeed())).toBe(true);
  });
});
