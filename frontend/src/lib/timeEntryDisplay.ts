import type { TimeEntry } from '@/types';

const trimValue = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const getTimeEntryTitle = (entry: Partial<TimeEntry>) =>
  trimValue(entry.task?.title)
  || trimValue(entry.project?.name)
  || 'No task selected';

export const getTimeEntrySubtitle = (
  entry: Partial<TimeEntry>,
  emptyLabel = 'No description provided'
) =>
  trimValue(entry.task?.description)
  || trimValue(entry.description)
  || trimValue(entry.task?.group?.name)
  || emptyLabel;
