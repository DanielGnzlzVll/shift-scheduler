import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../src/core/config.js';
import { loadConfig, parseConfigJson, saveConfig, serializeConfig } from '../../src/ui/storage.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), data };
};

describe('storage', () => {
  it('falls back to defaults when empty', () => {
    const { config, notice } = loadConfig(memoryStorage());
    expect(config.shifts).toHaveLength(2);
    expect(notice).toBeNull();
  });

  it('round-trips a saved config', () => {
    const storage = memoryStorage();
    const config = { ...defaultConfig(new Date(2026, 8, 25)), weeklyHours: 40 };
    saveConfig(config, storage);
    expect(loadConfig(storage).config).toEqual(config);
  });

  it('recovers from corrupt storage with a notice', () => {
    const storage = memoryStorage({ 'shift-scheduler.config': '{not json' });
    const { config, notice } = loadConfig(storage);
    expect(config.weeklyHours).toBe(42);
    expect(notice).toBe('La configuración guardada no era válida; se restauraron los valores por defecto.');
  });

  it('parses imported JSON and rejects invalid content', () => {
    const config = defaultConfig(new Date(2026, 8, 25));
    expect(parseConfigJson(serializeConfig(config))).toEqual({ config, error: null });
    expect(parseConfigJson('nope')).toEqual({ config: null, error: 'El archivo no es un JSON válido.' });
    expect(parseConfigJson('{"shifts": []}')).toEqual({ config: null, error: 'El archivo no contiene una configuración válida.' });
  });

  it('upgrades stored and imported configs that lack the per-shift consecutive limit', () => {
    const legacy = defaultConfig(new Date(2026, 8, 25));
    for (const shift of legacy.shifts) delete shift.maxConsecutive;
    const storage = memoryStorage({ 'shift-scheduler.config': JSON.stringify(legacy) });
    const loaded = loadConfig(storage);
    expect(loaded.notice).toBeNull();
    expect(loaded.config.shifts.map((s) => s.maxConsecutive)).toEqual([3, 3]);
    expect(parseConfigJson(JSON.stringify(legacy)).config.shifts.map((s) => s.maxConsecutive)).toEqual([3, 3]);
  });
});
