const API_URL = 'https://date.nager.at/api/v3/PublicHolidays';

export function createHolidayFetcher(fetchFn = (...args) => globalThis.fetch(...args), countryCode = 'CO') {
  const byYear = new Map();

  const loadYear = (year) => {
    if (!byYear.has(year)) {
      const request = fetchFn(`${API_URL}/${year}/${countryCode}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((list) => list.map((h) => h.date));
      request.catch(() => byYear.delete(year));
      byYear.set(year, request);
    }
    return byYear.get(year);
  };

  return async (year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    return (await loadYear(year)).filter((date) => date.startsWith(prefix));
  };
}

export const fetchColombiaHolidays = createHolidayFetcher();
