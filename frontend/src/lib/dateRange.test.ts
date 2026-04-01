import { describe, expect, it } from 'vitest';
import { DATE_RANGE_PRESET_OPTIONS, deriveDateRangeFromPreset, detectDateRangePreset, getDateRangePresetLabel, isDateRangePreset } from '@/lib/dateRange';

describe('dateRange helpers', () => {
  it('exposes the expected preset options', () => {
    expect(DATE_RANGE_PRESET_OPTIONS.map((option) => option.value)).toEqual(['today', '2d', '7d', '15d', '30d', 'custom']);
  });

  it('builds inclusive rolling ranges from the reference date', () => {
    const referenceDate = new Date(2026, 3, 1);

    expect(deriveDateRangeFromPreset('today', referenceDate)).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-04-01',
    });
    expect(deriveDateRangeFromPreset('2d', referenceDate)).toEqual({
      startDate: '2026-03-31',
      endDate: '2026-04-01',
    });
    expect(deriveDateRangeFromPreset('7d', referenceDate)).toEqual({
      startDate: '2026-03-26',
      endDate: '2026-04-01',
    });
    expect(deriveDateRangeFromPreset('15d', referenceDate)).toEqual({
      startDate: '2026-03-18',
      endDate: '2026-04-01',
    });
    expect(deriveDateRangeFromPreset('30d', referenceDate)).toEqual({
      startDate: '2026-03-03',
      endDate: '2026-04-01',
    });
  });

  it('detects known presets from explicit ranges', () => {
    const referenceDate = new Date(2026, 3, 1);

    expect(detectDateRangePreset('2026-03-31', '2026-04-01', referenceDate)).toBe('2d');
    expect(detectDateRangePreset('2026-03-18', '2026-04-01', referenceDate)).toBe('15d');
    expect(detectDateRangePreset('2026-03-01', '2026-04-01', referenceDate)).toBe('custom');
  });

  it('recognizes valid presets and resolves labels', () => {
    expect(isDateRangePreset('7d')).toBe(true);
    expect(isDateRangePreset('month')).toBe(false);
    expect(getDateRangePresetLabel('15d')).toBe('Last 15 days');
    expect(getDateRangePresetLabel('custom')).toBe('Custom range');
  });
});
