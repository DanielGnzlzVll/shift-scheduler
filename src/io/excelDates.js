import { DAY_MINUTES } from '../core/time.js';

const EPOCH_SERIAL = 25569;

export function serialToMinutes(serial) {
  return Math.round((serial - EPOCH_SERIAL) * DAY_MINUTES);
}

export function minutesToSerial(minutes) {
  return minutes / DAY_MINUTES + EPOCH_SERIAL;
}
