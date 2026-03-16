export const getWorkingDuration = (value: any) =>
  Number(value?.working_duration ?? value?.working_time ?? value?.billable_duration ?? value?.billable_time ?? 0);
