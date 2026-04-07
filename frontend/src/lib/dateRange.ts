export type DateRangePreset = 'today' | '2d' | '7d' | '15d' | '30d' | 'custom';

export const DATE_RANGE_PRESET_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '2d', label: 'Last 2 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '15d', label: 'Last 15 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

const localDateOnly = (value = new Date()) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const toDateInputValue = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

export const deriveDateRangeFromPreset = (preset: Exclude<DateRangePreset, 'custom'>, referenceDate = new Date()) => {
  const end = localDateOnly(referenceDate);
  const start = localDateOnly(referenceDate);

  if (preset === '2d') {
    start.setDate(start.getDate() - 1);
  } else if (preset === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (preset === '15d') {
    start.setDate(start.getDate() - 14);
  } else if (preset === '30d') {
    start.setDate(start.getDate() - 29);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

export const isDateRangePreset = (value: string): value is DateRangePreset =>
  DATE_RANGE_PRESET_OPTIONS.some((option) => option.value === value);

export const detectDateRangePreset = (
  startDate: string,
  endDate: string,
  referenceDate = new Date()
): DateRangePreset => {
  const knownPresets: Array<Exclude<DateRangePreset, 'custom'>> = ['today', '2d', '7d', '15d', '30d'];

  for (const preset of knownPresets) {
    const range = deriveDateRangeFromPreset(preset, referenceDate);
    if (range.startDate === startDate && range.endDate === endDate) {
      return preset;
    }
  }

  return 'custom';
};

export const resolvePersistedDateRange = (
  datePreset: DateRangePreset,
  startDate: string,
  endDate: string,
  referenceDate = new Date()
) => {
  if (datePreset === 'custom') {
    return { startDate, endDate };
  }

  return deriveDateRangeFromPreset(datePreset, referenceDate);
};

export const getDateRangePresetLabel = (preset: DateRangePreset) =>
  DATE_RANGE_PRESET_OPTIONS.find((option) => option.value === preset)?.label || 'Custom range';
