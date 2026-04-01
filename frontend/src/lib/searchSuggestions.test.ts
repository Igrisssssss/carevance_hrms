import { describe, expect, it } from 'vitest';
import { buildEmployeeSearchSuggestions, buildSearchSuggestions, matchesSearchFilter, rankSearchSuggestions } from '@/lib/searchSuggestions';

describe('search suggestion helpers', () => {
  it('matches by full query, substring, and word starts', () => {
    expect(matchesSearchFilter('john sm', ['John Smith', 'john.smith@carevance.com'])).toBe(true);
    expect(matchesSearchFilter('smith@care', ['John Smith', 'john.smith@carevance.com'])).toBe(true);
    expect(matchesSearchFilter('qa team', ['John Smith', 'john.smith@carevance.com'])).toBe(false);
  });

  it('ranks word-start matches ahead of loose substring matches', () => {
    const suggestions = buildEmployeeSearchSuggestions([
      { id: 1, name: 'Samir Khan', email: 'samir@carevance.com' },
      { id: 2, name: 'Irbaz Samir', email: 'irbaz@carevance.com' },
      { id: 3, name: 'Aamir Patel', email: 'aamir@carevance.com' },
    ]);

    expect(rankSearchSuggestions(suggestions, 'sa').map((item) => item.label)).toEqual([
      'Samir Khan',
      'Irbaz Samir',
    ]);
  });

  it('matches employee suggestions by name only, not by email text', () => {
    const suggestions = buildEmployeeSearchSuggestions([
      { id: 1, name: 'Manan', email: 'manan@test.com' },
      { id: 2, name: 'Adi', email: 'adi@test.com' },
      { id: 3, name: 'Ayush', email: 'ayush@test.com' },
    ]);

    expect(rankSearchSuggestions(suggestions, 'm').map((item) => item.label)).toEqual(['Manan']);
  });

  it('builds unique employee suggestions and keeps the email as supporting text', () => {
    const suggestions = buildEmployeeSearchSuggestions([
      { id: 11, name: 'Riya Shah', email: 'riya@carevance.com' },
      { id: 11, name: 'Riya Shah', email: 'riya@carevance.com' },
      { id: 12, name: '', email: 'solo@carevance.com' },
    ]);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      id: 11,
      label: 'Riya Shah',
      description: 'riya@carevance.com',
      value: 'Riya Shah',
    });
    expect(suggestions[1]).toMatchObject({
      id: 12,
      label: 'solo@carevance.com',
    });
  });

  it('builds generic suggestions and removes duplicates by id', () => {
    const suggestions = buildSearchSuggestions(
      [
        { id: 1, title: 'Payroll Ready', message: 'Cycle is prepared' },
        { id: 1, title: 'Payroll Ready', message: 'Cycle is prepared' },
        { id: 2, title: 'Attendance Reminder', message: 'Mark today before logout' },
      ],
      (item) => ({
        id: item.id,
        label: item.title,
        description: item.message,
      })
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((item) => item.label)).toEqual(['Payroll Ready', 'Attendance Reminder']);
  });
});
