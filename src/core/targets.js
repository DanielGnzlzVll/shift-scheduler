import { daysInMonth, monthRange } from './calendar.js';
import { clipInterval, mergeIntervals } from './time.js';

export function groupExceptions(exceptions) {
  const grouped = {};
  for (const { person, start, end } of exceptions) {
    (grouped[person] ??= []).push({ start, end });
  }
  for (const person of Object.keys(grouped)) {
    grouped[person] = mergeIntervals(grouped[person]);
  }
  return grouped;
}

export function computeTargets(people, grouped, config) {
  const { year, month, weeklyHours } = config;
  const base = (weeklyHours * daysInMonth(year, month)) / 7;
  const { start, end } = monthRange(year, month);
  const total = end - start;
  const targets = {};
  for (const person of people) {
    const blocked = (grouped[person] ?? [])
      .map((interval) => clipInterval(interval, start, end))
      .filter(Boolean)
      .reduce((sum, interval) => sum + interval.end - interval.start, 0);
    targets[person] = (base * (total - blocked)) / total;
  }
  return targets;
}
