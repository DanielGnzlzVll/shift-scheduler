export const DAY_MINUTES = 1440;

const pad = (n) => String(n).padStart(2, '0');

export function parseHHMM(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatHHMM(minutes) {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function shiftDuration(start, end) {
  return end > start ? end - start : end - start + DAY_MINUTES;
}

export function toMinutes(year, month, day, minuteOfDay = 0) {
  return Date.UTC(year, month - 1, day) / 60000 + minuteOfDay;
}

export function fromMinutes(minutes) {
  const d = new Date(minutes * 60000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

export function formatDateTime(minutes) {
  const { year, month, day, hour, minute } = fromMinutes(minutes);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }
  return merged;
}

export function clipInterval(interval, lo, hi) {
  const start = Math.max(interval.start, lo);
  const end = Math.min(interval.end, hi);
  return end > start ? { start, end } : null;
}
