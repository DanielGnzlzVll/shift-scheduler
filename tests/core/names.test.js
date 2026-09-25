import { describe, expect, it } from 'vitest';
import { normalizeName } from '../../src/core/names.js';

describe('normalizeName', () => {
  it('trims, collapses spaces, lowercases and strips accents', () => {
    expect(normalizeName('  José   Pérez ')).toBe('jose perez');
    expect(normalizeName('MARÍA')).toBe('maria');
  });

  it('handles empty values', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});
