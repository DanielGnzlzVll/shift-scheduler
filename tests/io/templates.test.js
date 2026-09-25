import { describe, expect, it } from 'vitest';
import { EXAMPLE_PEOPLE, buildExceptionsTemplate, buildPeopleTemplate } from '../../src/io/templates.js';
import { readPeople } from '../../src/io/readPeople.js';
import { readExceptions } from '../../src/io/readExceptions.js';
import { toMinutes } from '../../src/core/time.js';

describe('templates', () => {
  it('people template parses back to the example names', () => {
    expect(readPeople(buildPeopleTemplate())).toEqual({ people: EXAMPLE_PEOPLE, warnings: [], error: null });
  });

  it('exceptions template parses with no errors for next month', () => {
    const { exceptions, rowErrors } = readExceptions(buildExceptionsTemplate(new Date(2026, 8, 25)), EXAMPLE_PEOPLE);
    expect(rowErrors).toEqual([]);
    expect(exceptions).toEqual([
      { person: EXAMPLE_PEOPLE[0], start: toMinutes(2026, 10, 5), end: toMinutes(2026, 10, 8) },
      { person: EXAMPLE_PEOPLE[1], start: toMinutes(2026, 10, 10, 420), end: toMinutes(2026, 10, 10, 1140) },
    ]);
  });

  it('wraps December to January of next year', () => {
    const { exceptions } = readExceptions(buildExceptionsTemplate(new Date(2026, 11, 1)), EXAMPLE_PEOPLE);
    expect(exceptions[0].start).toBe(toMinutes(2027, 1, 5));
  });
});
