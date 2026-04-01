import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRightLeft, Building2, CalendarDays, CheckCircle2, Clock3, Edit2, Plus, Search, TimerReset, Trash2, UserPlus2, UserRound, Users, Users2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import MetricCard from '@/components/dashboard/MetricCard';
import QuickCreateGroupDialog from '@/components/groups/QuickCreateGroupDialog';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput, TextareaInput } from '@/components/ui/FormField';
import { queryKeys } from '@/lib/queryKeys';
import { groupApi, taskApi, userApi } from '@/services/api';
import type { Group, Task, User } from '@/types';
import { cn } from '@/utils/cn';

type SavedTaskStatus = Exclude<Task['status'], 'in_review'>;
type TaskPriority = Task['priority'];

type TaskFormState = {
  title: string;
  description: string;
  group_id: string;
  assignee_id: string;
  status: SavedTaskStatus;
  priority: TaskPriority;
  due_date: string;
  estimated_time: string;
};

const STATUS_OPTIONS: Array<{ value: SavedTaskStatus; label: string; accent: string }> = [
  { value: 'todo', label: 'To Do', accent: 'border-sky-100 bg-sky-50/70' },
  { value: 'in_progress', label: 'In Progress', accent: 'border-amber-100 bg-amber-50/70' },
  { value: 'done', label: 'Done', accent: 'border-emerald-100 bg-emerald-50/70' },
];

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const createTaskFormState = (groupId = '', status: SavedTaskStatus = 'todo'): TaskFormState => ({
  title: '',
  description: '',
  group_id: groupId,
  assignee_id: '',
  status,
  priority: 'medium',
  due_date: '',
  estimated_time: '',
});

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const toDate = (value?: string | null) => value ? new Date(value.includes('T') ? value : `${value}T00:00:00`) : null;
const formatDate = (value?: string | null) => {
  const date = toDate(value);
  return !date || Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const formatMinutes = (value?: number | null) => {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'No estimate';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManageTasks = user?.role === 'admin' || user?.role === 'manager';
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SavedTaskStatus>('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [groupDirectoryQuery, setGroupDirectoryQuery] = useState('');
  const [groupDirectoryFilter, setGroupDirectoryFilter] = useState('all');
  const [memberDrafts, setMemberDrafts] = useState<Record<number, string>>({});
  const [memberMoveDrafts, setMemberMoveDrafts] = useState<Record<string, string>>({});
  const [taskForm, setTaskForm] = useState<TaskFormState>(createTaskFormState());

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => (await taskApi.getAll()).data || [],
  });

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => (await groupApi.getAll()).data?.data || [],
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users({ period: 'all' }),
    queryFn: async () => (await userApi.getAll({ period: 'all' })).data || [],
  });

  const tasks = tasksQuery.data || [];
  const groups = groupsQuery.data || [];
  const users = usersQuery.data || [];
  const internalUsers = useMemo(
    () => users.filter((member) => member.role !== 'client'),
    [users]
  );
  const selectedGroupId = taskForm.group_id ? Number(taskForm.group_id) : null;
  const availableAssignees = useMemo(
    () => users.filter((member) => !selectedGroupId || member.groups?.some((group) => group.id === selectedGroupId)),
    [selectedGroupId, users]
  );

  const saveTaskMutation = useMutation({
    mutationFn: async (payload: Partial<Task>) => {
      if (editingTask) {
        await taskApi.update(editingTask.id, payload);
        return 'Task updated successfully.';
      }
      await taskApi.create(payload);
      return 'Task created successfully.';
    },
    onSuccess: async (message) => {
      setFeedback({ tone: 'success', message });
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm(createTaskFormState(groupFilter === 'all' ? '' : groupFilter));
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (error: any) => {
      const fieldError = Object.values(error?.response?.data?.errors || {}).flat().find(Boolean);
      setFeedback({ tone: 'error', message: String(fieldError || error?.response?.data?.message || 'Failed to save task.') });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: SavedTaskStatus }) => taskApi.updateStatus(taskId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => taskApi.delete(taskId),
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Task deleted successfully.' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const syncMembershipMutation = useMutation({
    mutationFn: async ({ userId, groupIds, successMessage }: { userId: number; groupIds: number[]; successMessage: string }) => {
      await userApi.update(userId, { group_ids: groupIds });
      return successMessage;
    },
    onSuccess: async (message) => {
      setFeedback({ tone: 'success', message });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users({ period: 'all' }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
      ]);
    },
    onError: (error: any) => {
      const fieldError = Object.values(error?.response?.data?.errors || {}).flat().find(Boolean);
      setFeedback({ tone: 'error', message: String(fieldError || error?.response?.data?.message || 'Failed to update group membership.') });
    },
  });

  const isLoading = tasksQuery.isLoading || groupsQuery.isLoading || usersQuery.isLoading;
  const isError = tasksQuery.isError || groupsQuery.isError || usersQuery.isError;

  const filteredTasks = tasks.filter((task) => {
    const haystack = [task.title, task.description, task.group?.name, task.assignee?.name, task.assignee?.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesGroup = groupFilter === 'all' || String(task.group_id || '') === groupFilter;
    const matchesAssignee = assigneeFilter === 'all' || String(task.assignee_id || '') === assigneeFilter;
    return matchesSearch && matchesStatus && matchesGroup && matchesAssignee;
  });

  const hasDirectorySearch = groupDirectoryQuery.trim().length > 0;
  const hasDirectorySelection = groupDirectoryFilter !== 'all';
  const shouldShowDirectoryResults = hasDirectorySearch || hasDirectorySelection;

  const filteredDirectoryGroups = useMemo(() => {
    if (!shouldShowDirectoryResults) {
      return [];
    }

    const needle = groupDirectoryQuery.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesSelectedGroup = groupDirectoryFilter === 'all' || String(group.id) === groupDirectoryFilter;
      if (!matchesSelectedGroup) return false;

      if (!needle) return true;

      const searchable = [group.name, group.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(needle);
    });
  }, [groupDirectoryFilter, groupDirectoryQuery, groups, shouldShowDirectoryResults]);

  const findUserById = (userId: number) => users.find((candidate) => candidate.id === userId);

  const handleAddMemberToGroup = (group: Group) => {
    const selectedUserId = Number(memberDrafts[group.id] || 0);
    if (!selectedUserId) {
      setFeedback({ tone: 'error', message: `Select a team member to add into ${group.name}.` });
      return;
    }

    const member = findUserById(selectedUserId);
    if (!member) {
      setFeedback({ tone: 'error', message: 'Selected team member could not be found.' });
      return;
    }

    const nextGroupIds = Array.from(new Set([...(member.groups || []).map((currentGroup) => currentGroup.id), group.id]));

    syncMembershipMutation.mutate({
      userId: member.id,
      groupIds: nextGroupIds,
      successMessage: `${member.name} was added to ${group.name}.`,
    });

    setMemberDrafts((current) => ({ ...current, [group.id]: '' }));
  };

  const handleMoveEmployeeToGroup = (member: User, currentGroup: Group) => {
    const draftKey = `${currentGroup.id}:${member.id}`;
    const selectedTargetId = Number(memberMoveDrafts[draftKey] || 0);
    if (!selectedTargetId || selectedTargetId === currentGroup.id) {
      setFeedback({ tone: 'error', message: 'Choose a different group before moving this employee.' });
      return;
    }

    const targetGroup = groups.find((group) => group.id === selectedTargetId);
    if (!targetGroup) {
      setFeedback({ tone: 'error', message: 'Selected destination group could not be found.' });
      return;
    }

    syncMembershipMutation.mutate({
      userId: member.id,
      groupIds: [targetGroup.id],
      successMessage: `${member.name} was moved to ${targetGroup.name}.`,
    });

    setMemberMoveDrafts((current) => ({ ...current, [draftKey]: '' }));
  };

  if (isLoading) return <PageLoadingState label="Loading task workspace..." />;

  if (isError) {
    return (
      <PageErrorState
        message={(tasksQuery.error as any)?.response?.data?.message || (groupsQuery.error as any)?.response?.data?.message || (usersQuery.error as any)?.response?.data?.message || 'Failed to load tasks.'}
        onRetry={() => {
          void tasksQuery.refetch();
          void groupsQuery.refetch();
          void usersQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <SurfaceCard className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Task workspace</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-slate-950">Manage tasks by group instead of project.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Each task now belongs to a department group, and assignees are limited to users inside that group.</p>
          </div>
          {canManageTasks ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" iconLeft={<Building2 className="h-4 w-4" />} onClick={() => setShowGroupModal(true)}>New Group</Button>
              <Button iconLeft={<Plus className="h-4 w-4" />} onClick={() => {
                setEditingTask(null);
                setTaskForm(createTaskFormState(groupFilter === 'all' ? '' : groupFilter));
                setShowTaskModal(true);
              }}>New Task</Button>
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tasks In View" value={filteredTasks.length} hint="After filters" icon={CheckCircle2} accent="sky" />
        <MetricCard label="Completed" value={filteredTasks.filter((task) => task.status === 'done').length} hint="Marked done" icon={CheckCircle2} accent="emerald" />
        <MetricCard label="Overdue" value={filteredTasks.filter((task) => task.due_date && (toDate(task.due_date)?.getTime() || 0) < Date.now() && task.status !== 'done').length} hint="Open past deadline" icon={AlertTriangle} accent="rose" />
        <MetricCard label="Groups In View" value={groups.length} hint="Available departments" icon={Users2} accent="violet" />
      </div>

      <SurfaceCard className="p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by task, group, or assignee" className="pl-10" />
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | SavedTaskStatus)}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <SelectInput value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
              <option value="all">All assignees</option>
              <option value="">Unassigned</option>
              {users.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </SelectInput>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <FieldLabel>Group</FieldLabel>
            <SelectInput value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="all">All groups</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </SelectInput>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageTasks ? <Button variant="secondary" size="sm" onClick={() => setShowGroupModal(true)}>Add Group</Button> : null}
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setGroupFilter('all');
              setAssigneeFilter('all');
            }}>Reset Filters</Button>
          </div>
        </div>
      </SurfaceCard>

      {canManageTasks ? (
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Group directory</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">See every group and manage members from this page.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Add existing members into a group, review who is already inside each department, or move an employee directly to another group without leaving the task workspace.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quick rule</p>
              <p className="mt-2">Adding keeps the user&apos;s existing memberships. Moving an employee here switches their active group assignment to the selected destination.</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto] lg:items-end">
              <div>
                <FieldLabel>Search Group</FieldLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    aria-label="Search group directory"
                    value={groupDirectoryQuery}
                    onChange={(event) => setGroupDirectoryQuery(event.target.value)}
                    placeholder="Search group by name"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Group Dropdown</FieldLabel>
                <SelectInput
                  aria-label="Filter group directory"
                  value={groupDirectoryFilter}
                  onChange={(event) => setGroupDirectoryFilter(event.target.value)}
                >
                  <option value="all">All groups</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </SelectInput>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGroupDirectoryQuery('');
                  setGroupDirectoryFilter('all');
                }}
              >
                Reset
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {shouldShowDirectoryResults
                ? `Showing ${filteredDirectoryGroups.length} of ${groups.length} group${groups.length === 1 ? '' : 's'}.`
                : 'Groups are hidden by default. Search by name or choose one group from the dropdown.'}
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">No groups have been created yet. Create the first group to start organizing users and tasks.</div>
          ) : !shouldShowDirectoryResults ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">Search for a group name to view directory cards.</div>
          ) : filteredDirectoryGroups.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">No groups match your search right now. Try a different name or reset the group filters.</div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredDirectoryGroups.map((group) => {
                const members = (group.users || [])
                  .map((member) => findUserById(member.id) || null)
                  .filter((member): member is User => Boolean(member) && member.role !== 'client');
                const availableMembers = internalUsers.filter((member) => !(member.groups || []).some((assignedGroup) => assignedGroup.id === group.id));

                return (
                  <div key={group.id} className="rounded-[28px] border border-slate-200/90 bg-white/90 p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{group.name}</h3>
                          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', group.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                            {group.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{group.description || 'No group description yet. Use this section to keep people and tasks aligned inside the same department.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          <Users className="h-3.5 w-3.5" />
                          {members.length} member{members.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {group.tasks_count ?? tasks.filter((task) => task.group_id === group.id).length} task{(group.tasks_count ?? tasks.filter((task) => task.group_id === group.id).length) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <FieldLabel>Add Existing Member</FieldLabel>
                          <SelectInput
                            aria-label={`Add existing member to ${group.name}`}
                            value={memberDrafts[group.id] || ''}
                            onChange={(event) => setMemberDrafts((current) => ({ ...current, [group.id]: event.target.value }))}
                            disabled={availableMembers.length === 0 || syncMembershipMutation.isPending}
                          >
                            <option value="">{availableMembers.length === 0 ? 'All available members are already assigned' : 'Select a team member'}</option>
                            {availableMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({titleCase(member.role)})
                              </option>
                            ))}
                          </SelectInput>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          iconLeft={<UserPlus2 className="h-4 w-4" />}
                          aria-label={`Add member to ${group.name}`}
                          disabled={!memberDrafts[group.id] || syncMembershipMutation.isPending}
                          onClick={() => handleAddMemberToGroup(group)}
                        >
                          {syncMembershipMutation.isPending ? 'Saving...' : 'Add Member'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {members.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">No members are assigned to this group yet.</div>
                      ) : (
                        members.map((member) => {
                          const moveKey = `${group.id}:${member.id}`;

                          return (
                            <div key={moveKey} className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4">
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-slate-950">{member.name}</p>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{titleCase(member.role)}</span>
                                  </div>
                                  <p className="mt-1 truncate text-sm text-slate-500">{member.email}</p>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Current group{(member.groups || []).length === 1 ? '' : 's'}: {(member.groups || []).map((assignedGroup) => assignedGroup.name).join(', ') || 'None'}
                                  </p>
                                </div>

                                {member.role === 'employee' ? (
                                  <div className="grid min-w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[22rem]">
                                    <SelectInput
                                      aria-label={`Move ${member.name} to another group`}
                                      value={memberMoveDrafts[moveKey] || ''}
                                      onChange={(event) => setMemberMoveDrafts((current) => ({ ...current, [moveKey]: event.target.value }))}
                                      disabled={groups.length <= 1 || syncMembershipMutation.isPending}
                                    >
                                      <option value="">{groups.length <= 1 ? 'Create another group first' : 'Move employee to another group'}</option>
                                      {groups.filter((targetGroup) => targetGroup.id !== group.id).map((targetGroup) => (
                                        <option key={targetGroup.id} value={targetGroup.id}>
                                          {targetGroup.name}
                                        </option>
                                      ))}
                                    </SelectInput>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      iconLeft={<ArrowRightLeft className="h-4 w-4" />}
                                      aria-label={`Move ${member.name}`}
                                      disabled={!memberMoveDrafts[moveKey] || syncMembershipMutation.isPending}
                                      onClick={() => handleMoveEmployeeToGroup(member, group)}
                                    >
                                      {syncMembershipMutation.isPending ? 'Moving...' : 'Move'}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Move action is available for employees here.</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {STATUS_OPTIONS.map((section) => (
          <SurfaceCard key={section.value} className="overflow-hidden p-0">
            <div className={cn('border-b px-5 py-4', section.accent)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.label}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{filteredTasks.filter((task) => task.status === section.value).length} task{filteredTasks.filter((task) => task.status === section.value).length === 1 ? '' : 's'}</h2>
                </div>
                {canManageTasks ? <Button variant="ghost" size="sm" onClick={() => {
                  setEditingTask(null);
                  setTaskForm(createTaskFormState(groupFilter === 'all' ? '' : groupFilter, section.value));
                  setShowTaskModal(true);
                }}>Add Task</Button> : null}
              </div>
            </div>
            <div className="max-h-[38rem] space-y-4 overflow-y-auto p-4">
              {filteredTasks.filter((task) => task.status === section.value).map((task) => (
                <article key={task.id} className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{titleCase(task.status)}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{titleCase(task.priority || 'medium')}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">{task.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{task.description || 'No description yet.'}</p>
                    </div>
                    {canManageTasks ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => {
                          setEditingTask(task);
                          setTaskForm({
                            title: task.title,
                            description: task.description || '',
                            group_id: task.group_id ? String(task.group_id) : '',
                            assignee_id: task.assignee_id ? String(task.assignee_id) : '',
                            status: (task.status === 'in_review' ? 'todo' : task.status) as SavedTaskStatus,
                            priority: task.priority || 'medium',
                            due_date: task.due_date?.split('T')[0] || '',
                            estimated_time: task.estimated_time ? String(task.estimated_time) : '',
                          });
                          setShowTaskModal(true);
                        }} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => {
                          if (!confirm('Delete this task?')) return;
                          void deleteTaskMutation.mutate(task.id);
                        }} className="rounded-full p-2 text-slate-400 transition hover:bg-rose-100 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setGroupFilter((current) => current === String(task.group_id || '') ? 'all' : String(task.group_id || ''))} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <Building2 className="h-3.5 w-3.5" />
                      {task.group?.name || 'Ungrouped'}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TaskDetail icon={UserRound} label="Assignee" value={task.assignee?.name || 'Unassigned'} />
                    <TaskDetail icon={CalendarDays} label="Due Date" value={formatDate(task.due_date)} />
                    <TaskDetail icon={TimerReset} label="Estimate" value={formatMinutes(task.estimated_time)} />
                    <TaskDetail icon={Clock3} label="Updated" value={formatDate(task.updated_at)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                    {task.status !== 'todo' ? <Button variant="ghost" size="sm" onClick={() => void updateStatusMutation.mutate({ taskId: task.id, status: 'todo' })}>Move To Do</Button> : null}
                    {task.status !== 'in_progress' ? <Button variant="ghost" size="sm" onClick={() => void updateStatusMutation.mutate({ taskId: task.id, status: 'in_progress' })}>Start Work</Button> : null}
                    {task.status !== 'done' ? <Button variant="ghost" size="sm" onClick={() => void updateStatusMutation.mutate({ taskId: task.id, status: 'done' })}>Mark Done</Button> : null}
                  </div>
                </article>
              ))}
              {filteredTasks.filter((task) => task.status === section.value).length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">No tasks in this column.</div> : null}
            </div>
          </SurfaceCard>
        ))}
      </div>

      {showTaskModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Task composer</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{editingTask ? 'Edit task' : 'Create task'}</h2>
              </div>
              <button type="button" onClick={() => setShowTaskModal(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={(event) => {
              event.preventDefault();
              if (!taskForm.group_id) {
                setFeedback({ tone: 'error', message: 'Select a group before saving this task.' });
                return;
              }
              void saveTaskMutation.mutate({
                title: taskForm.title.trim(),
                description: taskForm.description.trim() || undefined,
                group_id: Number(taskForm.group_id),
                assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null,
                status: taskForm.status,
                priority: taskForm.priority,
                due_date: taskForm.due_date || undefined,
                estimated_time: taskForm.estimated_time ? Number(taskForm.estimated_time) : undefined,
              });
            }}>
              <div>
                <FieldLabel>Task Title</FieldLabel>
                <TextInput required value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Prepare weekly performance review" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Group</label>
                    <button type="button" onClick={() => setShowGroupModal(true)} className="text-xs font-semibold text-sky-600 transition hover:text-sky-700">+ Create new group</button>
                  </div>
                  <SelectInput required value={taskForm.group_id} onChange={(event) => setTaskForm((current) => ({ ...current, group_id: event.target.value, assignee_id: '' }))}>
                    <option value="">Select group</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Assign To</FieldLabel>
                  <SelectInput value={taskForm.assignee_id} onChange={(event) => setTaskForm((current) => ({ ...current, assignee_id: event.target.value }))} disabled={!taskForm.group_id}>
                    <option value="">{!taskForm.group_id ? 'Select group first' : 'Unassigned'}</option>
                    {availableAssignees.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <SelectInput value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as SavedTaskStatus }))}>
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectInput value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                    {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{titleCase(priority)}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <TextInput type="date" value={taskForm.due_date} onChange={(event) => setTaskForm((current) => ({ ...current, due_date: event.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Estimated Time</FieldLabel>
                  <TextInput type="number" min="0" value={taskForm.estimated_time} onChange={(event) => setTaskForm((current) => ({ ...current, estimated_time: event.target.value }))} placeholder="120" />
                </div>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextareaInput rows={5} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} placeholder="Capture acceptance criteria, blockers, links, or the expected outcome." />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saveTaskMutation.isPending || groups.length === 0}>{saveTaskMutation.isPending ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <QuickCreateGroupDialog
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={(group) => {
          setTaskForm((current) => ({ ...current, group_id: String(group.id) }));
          setGroupFilter(String(group.id));
        }}
        title="Create a group without leaving tasks"
        description="Add the new department here and it will be available immediately in the task form."
      />
    </div>
  );
}

function TaskDetail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
