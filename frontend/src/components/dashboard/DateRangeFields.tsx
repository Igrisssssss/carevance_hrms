import { FieldLabel, SelectInput, TextInput } from '@/components/ui/FormField';
import { DATE_RANGE_PRESET_OPTIONS, type DateRangePreset } from '@/lib/dateRange';

interface DateRangeFieldsProps {
  datePreset: DateRangePreset;
  onDatePresetChange: (value: DateRangePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  presetLabel?: string;
  startLabel?: string;
  endLabel?: string;
  inputClassName?: string;
}

export default function DateRangeFields({
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  presetLabel = 'Date Range',
  startLabel = 'Start Date',
  endLabel = 'End Date',
  inputClassName,
}: DateRangeFieldsProps) {
  return (
    <>
      <div>
        <FieldLabel>{presetLabel}</FieldLabel>
        <SelectInput
          value={datePreset}
          onChange={(event) => onDatePresetChange(event.target.value as DateRangePreset)}
          aria-label={presetLabel}
          className={inputClassName}
        >
          {DATE_RANGE_PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </div>

      <div>
        <FieldLabel>{startLabel}</FieldLabel>
        <TextInput
          type="date"
          value={startDate}
          disabled={datePreset !== 'custom'}
          onChange={(event) => onStartDateChange(event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <FieldLabel>{endLabel}</FieldLabel>
        <TextInput
          type="date"
          value={endDate}
          disabled={datePreset !== 'custom'}
          onChange={(event) => onEndDateChange(event.target.value)}
          className={inputClassName}
        />
      </div>
    </>
  );
}
