import { describe, expect, it } from 'vitest';
import { getTimeEntrySubtitle, getTimeEntryTitle } from '@/lib/timeEntryDisplay';

describe('timeEntryDisplay', () => {
  it('prefers the selected task details when a timer is started with a task', () => {
    const entry = {
      task: {
        title: 'Prepare monthly report',
        description: 'Compile finance and attendance updates',
        group: {
          name: 'Finance',
        },
      },
      project: {
        name: 'Operations',
      },
      description: 'Fallback description',
    };

    expect(getTimeEntryTitle(entry)).toBe('Prepare monthly report');
    expect(getTimeEntrySubtitle(entry)).toBe('Compile finance and attendance updates');
  });

  it('falls back to no-task messaging when a timer is started without task context', () => {
    const entry = {
      project: null,
      task: null,
      description: '',
    };

    expect(getTimeEntryTitle(entry)).toBe('No task selected');
    expect(getTimeEntrySubtitle(entry)).toBe('No description provided');
    expect(getTimeEntrySubtitle(entry, 'No description')).toBe('No description');
  });

  it('uses the time entry description before group name when the task has no description', () => {
    const entry = {
      task: {
        title: 'Handle support tickets',
        description: '   ',
        group: {
          name: 'Customer Success',
        },
      },
      description: 'Inbox zero sprint',
    };

    expect(getTimeEntrySubtitle(entry)).toBe('Inbox zero sprint');
  });
});
