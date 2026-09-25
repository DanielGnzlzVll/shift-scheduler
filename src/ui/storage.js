import { defaultConfig, normalizeConfig, validateConfig } from '../core/config.js';

const KEY = 'shift-scheduler.config';

export function parseConfigJson(text) {
  let config;
  try {
    config = normalizeConfig(JSON.parse(text));
  } catch {
    return { config: null, error: 'El archivo no es un JSON válido.' };
  }
  if (!validateConfig(config).valid) return { config: null, error: 'El archivo no contiene una configuración válida.' };
  return { config, error: null };
}

export function serializeConfig(config) {
  return JSON.stringify(config, null, 2);
}

export function loadConfig(storage = globalThis.localStorage) {
  const raw = storage?.getItem(KEY);
  if (!raw) return { config: defaultConfig(), notice: null };
  const { config, error } = parseConfigJson(raw);
  if (error) {
    return { config: defaultConfig(), notice: 'La configuración guardada no era válida; se restauraron los valores por defecto.' };
  }
  return { config, notice: null };
}

export function saveConfig(config, storage = globalThis.localStorage) {
  storage?.setItem(KEY, JSON.stringify(config));
}
