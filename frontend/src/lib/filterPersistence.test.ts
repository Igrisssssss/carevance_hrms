import { beforeEach, describe, expect, it } from 'vitest';
import { readSessionStorageJson, writeSessionStorageJson } from '@/lib/filterPersistence';

describe('filterPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('writes persisted filters to localStorage and sessionStorage', () => {
    writeSessionStorageJson('filters', { datePreset: '30d', selectedUserId: 7 });

    expect(window.localStorage.getItem('filters')).toBe('{"datePreset":"30d","selectedUserId":7}');
    expect(window.sessionStorage.getItem('filters')).toBe('{"datePreset":"30d","selectedUserId":7}');
  });

  it('prefers the localStorage copy when reading filters', () => {
    window.localStorage.setItem('filters', '{"datePreset":"today","selectedUserId":4}');
    window.sessionStorage.setItem('filters', '{"datePreset":"30d","selectedUserId":9}');

    expect(readSessionStorageJson<{ datePreset: string; selectedUserId: number }>('filters')).toEqual({
      datePreset: 'today',
      selectedUserId: 4,
    });
  });

  it('migrates an existing sessionStorage filter snapshot into localStorage', () => {
    window.sessionStorage.setItem('filters', '{"datePreset":"7d","selectedUserId":3}');

    expect(readSessionStorageJson<{ datePreset: string; selectedUserId: number }>('filters')).toEqual({
      datePreset: '7d',
      selectedUserId: 3,
    });
    expect(window.localStorage.getItem('filters')).toBe('{"datePreset":"7d","selectedUserId":3}');
  });
});
