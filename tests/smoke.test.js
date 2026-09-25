import { describe, expect, it } from 'vitest';
import { APP_TITLE } from '../src/core/index.js';

describe('smoke', () => {
  it('exposes the app title', () => {
    expect(APP_TITLE).toBe('Cuadro de Turnos');
  });
});
