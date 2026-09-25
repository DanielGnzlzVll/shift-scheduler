import { describe, expect, it, vi } from 'vitest';
import { createHolidayFetcher } from '../../src/io/holidays.js';

const response = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

const API_BODY = [
  { date: '2026-10-12', localName: 'Día de la Raza' },
  { date: '2026-11-02', localName: 'Dia de los Santos' },
  { date: '2026-11-16', localName: 'Independencia de Cartagena' },
];

describe('createHolidayFetcher', () => {
  it('queries Colombia holidays and keeps only the requested month', async () => {
    const fetchFn = vi.fn(async () => response(API_BODY));
    const fetchHolidays = createHolidayFetcher(fetchFn);
    expect(await fetchHolidays(2026, 11)).toEqual(['2026-11-02', '2026-11-16']);
    expect(fetchFn).toHaveBeenCalledWith('https://date.nager.at/api/v3/PublicHolidays/2026/CO');
  });

  it('requests each year once', async () => {
    const fetchFn = vi.fn(async () => response(API_BODY));
    const fetchHolidays = createHolidayFetcher(fetchFn);
    await fetchHolidays(2026, 10);
    expect(await fetchHolidays(2026, 11)).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('fails on HTTP errors and retries on the next call', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(response(null, false)).mockResolvedValueOnce(response(API_BODY));
    const fetchHolidays = createHolidayFetcher(fetchFn);
    await expect(fetchHolidays(2026, 10)).rejects.toThrow('HTTP 500');
    expect(await fetchHolidays(2026, 10)).toEqual(['2026-10-12']);
  });
});
