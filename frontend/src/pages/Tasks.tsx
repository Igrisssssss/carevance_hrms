import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MetricCard from '@/components/dashboard/MetricCard';
import SurfaceCard from '@/components/dashboard/SurfaceCard';
import Button from '@/components/ui/Button';
import { FeedbackBanner, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { FieldLabel, SelectInput, TextInput, TextareaInput } from '@/components/ui/FormField';
import { queryKeys } from '@/lib/queryKeys';
import { projectApi, taskApi, userApi } from '@/services/api';
import type { Project, Task } from '@/types';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Edit2,
  FolderKanban,
  FolderPlus,
  ListTodo,
  Plus,
  Search,
  TimerReset,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

type SavedTaskStatus = Exclude<Task['status'], 'in_review'>;
type TaskPriority = Task['priority'];
type ProjectStatus = Exclude<Project['status'], 'on_hold'>;
type FeedbackState = { tone: 'success' | 'error'; message: string } | null;

type TaskFormState = {
  title: string;
  description: string;
  project_id: string;
  assignee_id: string;
  status: SavedTaskStatus;
  priority: TaskPriority;
  due_date: string;
  estimated_time: string;
};

type ProjectFormState = {
  name: string;
  description: string;
  budget: string;
  deadline: string;
  status: ProjectStatus;
};

const TASK_STATUS_OPTIONS: Array<{ value: SavedTaskStatus; label: string; description: string; accent: 'sky' | 'amber' | 'emerald' }> = [
  { value: 'todo', label: 'To Do', description: 'Ready to pick up', accent: 'sky' },
  { value: 'in_progress', label: 'In Progress', description: 'Actively moving', accent: 'amber' },
  { value: 'done', label: 'Done', description: 'Completed work', accent: 'emerald' },
];

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['active', 'completed', 'archived'];
const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const statusBadgeClasses: Record<SavedTaskStatus, string> = {
  todo: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  in_progress: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  done: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
};

const priorityBadgeClasses: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  medium: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  high: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  urgent: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
};

const dueBadgeClasses: Record<'none' | 'healthy' | 'soon' | 'overdue' | 'done', string> = {
  none: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  healthy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  soon: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  overdue: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  done: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
};

const createTaskFormState = (projectId = '', status: SavedTaskStatus = 'todo'): TaskFormState => ({
  title: '',
  description: '',
  project_id: projectId,
  assignee_id: '',
  status,
  priority: 'medium',
  due_date: '',
  estimated_time: '',
});

const createProjectFormState = (): ProjectFormState => ({
  name: '',
  description: '',
  budget: '',
  deadline: '',
  status: 'active',
});

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const toSafeDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value.includes('T') ? value : `${value}T00:00:00`);
};

const formatDate = (value?: string | null) => {
  const date = toSafeDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
  const date = toSafeDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const formatMinutes = (value?: number | null) => {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'No estimate';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainder}m`;
};

const getDueMeta = (task: Task) => {
  if (task.status === 'done') return { tone: 'done' as const, label: 'Completed' };
  const dueDate = toSafeDate(task.due_date);
  if (!dueDate) return { tone: 'none' as const, label: 'No deadline' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffInDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (diffInDays < 0) return { tone: 'overdue' as const, label: `Overdue since ${formatDate(task.due_date)}` };
  if (diffInDays <= 2) return { tone: 'soon' as const, label: diffInDays === 0 ? 'Due today' : `Due in ${diffInDays} day${diffInDays === 1 ? '' : 's'}` };
  return { tone: 'healthy' as const, label: `Due ${formatDate(task.due_date)}` };
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SavedTaskStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [taskFormData, setTaskFormData] = useState<TaskFormState>(createTaskFormState());
  const [projectFormData, setProjectFormData] = useState<ProjectFormState>(createProjectFormState());

  const { data: tasks = [], isLoading: isTasksLoading, isError: isTasksError, error: tasksError, refetch: refetchTasks } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => (await taskApi.getAll()).data || [],
  });

  const { data: projects = [], isLoading: isProjectsLoading, isError: isProjectsError, error: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => (await projectApi.getAll()).data || [],
  });

  const { data: users = [], isLoading: isUsersLoading, isError: isUsersError, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: queryKeys.users({ period: 'all' }),
    queryFn: async () => (await userApi.getAll({ period: 'all' })).data || [],
  });

  const resetTaskForm = (projectId = '', status: SavedTaskStatus = 'todo') => {
    setTaskFormData(createTaskFormState(projectId, status));
    setEditingTask(null);
  };

  const resetProjectForm = () => setProjectFormData(createProjectFormState());

  const saveTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      if (editingTask) {
        await taskApi.update(editingTask.id, data);
        return 'Task updated successfully.';
      }
      await taskApi.create(data);
      return 'Task created successfully.';
    },
    onSuccess: async (message) => {
      setFeedback({ tone: 'success', message });
      setShowTaskModal(false);
      resetTaskForm(projectFilter === 'all' ? '' : projectFilter);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => setFeedback({ tone: 'error', message: mutationError?.response?.data?.message || 'Failed to save task.' }),
  });

  const saveProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => (await projectApi.create(data)).data,
    onSuccess: async (project) => {
      setFeedback({ tone: 'success', message: `Project "${project.name}" is ready to use in tasks.` });
      setShowProjectModal(false);
      resetProjectForm();
      setTaskFormData((current) => ({ ...current, project_id: String(project.id) }));
      setProjectFilter(String(project.id));
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: (mutationError: any) => setFeedback({ tone: 'error', message: mutationError?.response?.data?.message || 'Failed to save project.' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: SavedTaskStatus }) => {
      await taskApi.updateStatus(taskId, status);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => setFeedback({ tone: 'error', message: mutationError?.response?.data?.message || 'Failed to update task status.' }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await taskApi.delete(id);
    },
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Task deleted successfully.' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => setFeedback({ tone: 'error', message: mutationError?.response?.data?.message || 'Failed to delete task.' }),
  });

  const openTaskComposer = (status: SavedTaskStatus = 'todo') => {
    resetTaskForm(projectFilter === 'all' ? '' : projectFilter, status);
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id ? String(task.project_id) : '',
      assignee_id: task.assignee_id ? String(task.assignee_id) : '',
      status: (task.status === 'in_review' ? 'todo' : task.status) as SavedTaskStatus,
      priority: task.priority || 'medium',
      due_date: task.due_date?.split('T')[0] || '',
      estimated_time: task.estimated_time ? String(task.estimated_time) : '',
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!taskFormData.project_id) {
      setFeedback({ tone: 'error', message: 'Select a project before saving this task.' });
      return;
    }
    const payload: Partial<Task> = {
      title: taskFormData.title.trim(),
      description: taskFormData.description.trim() || undefined,
      project_id: Number(taskFormData.project_id),
      assignee_id: taskFormData.assignee_id ? Number(taskFormData.assignee_id) : undefined,
      status: taskFormData.status,
      priority: taskFormData.priority,
      due_date: taskFormData.due_date || undefined,
      estimated_time: taskFormData.estimated_time ? Number(taskFormData.estimated_time) : undefined,
    };
    await saveTaskMutation.mutateAsync(payload);
  };

  const handleProjectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const payload: Partial<Project> = {
      name: projectFormData.name.trim(),
      description: projectFormData.description.trim() || undefined,
      budget: projectFormData.budget ? Number(projectFormData.budget) : undefined,
      deadline: projectFormData.deadline || undefined,
      status: projectFormData.status,
    };
    await saveProjectMutation.mutateAsync(payload);
  };

  const handleStatusChange = async (task: Task, status: SavedTaskStatus) => {
    setFeedback(null);
    await updateStatusMutation.mutateAsync({ taskId: task.id, status });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    setFeedback(null);
    await deleteTaskMutation.mutateAsync(id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProjectFilter('all');
    setAssigneeFilter('all');
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        [task.title, task.description, task.project?.name, task.assignee?.name, task.assignee?.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesProject = projectFilter === 'all' || String(task.project_id) === projectFilter;
      const matchesAssignee = assigneeFilter === 'all' || String(task.assignee_id || '') === assigneeFilter;
      return matchesSearch && matchesStatus && matchesProject && matchesAssignee;
    })
    .sort((left, right) => {
      const leftDue = toSafeDate(left.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
      const rightDue = toSafeDate(right.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) return leftDue - rightDue;
      return (toSafeDate(right.updated_at)?.getTime() || 0) - (toSafeDate(left.updated_at)?.getTime() || 0);
    });

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((task) => task.status === 'done').length;
  const overdueTasks = filteredTasks.filter((task) => getDueMeta(task).tone === 'overdue').length;
  const linkedProjects = new Set(filteredTasks.map((task) => task.project_id).filter(Boolean)).size;
  const isLoading = isTasksLoading || isProjectsLoading || isUsersLoading;
  const isError = isTasksError || isProjectsError || isUsersError;

  if (isLoading) return <PageLoadingState label="Loading task workspace..." />;

  if (isError) {
    return (
      <PageErrorState
        message={(tasksError as any)?.response?.data?.message || (projectsError as any)?.response?.data?.message || (usersError as any)?.response?.data?.message || 'Failed to load task workspace.'}
        onRetry={() => {
          void refetchTasks();
          void refetchProjects();
          void refetchUsers();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <SurfaceCard className="overflow-hidden p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Task workspace</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-slate-950">Add tasks, attach them to projects, and keep the whole delivery flow visible.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">You can now create a project right from this page, then use it immediately inside the task form. Each task card also shows more planning details so the board feels useful instead of empty.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="secondary" iconLeft={<FolderPlus className="h-4 w-4" />} onClick={() => { resetProjectForm(); setShowProjectModal(true); }}>
              New Project
            </Button>
            <Button iconLeft={<Plus className="h-4 w-4" />} onClick={() => openTaskComposer()}>
              New Task
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tasks In View" value={totalTasks} hint="After search and filters" icon={ListTodo} accent="sky" />
        <MetricCard label="Completed" value={completedTasks} hint="Marked done in the current scope" icon={CheckCircle2} accent="emerald" />
        <MetricCard label="Overdue" value={overdueTasks} hint="Open tasks past their deadline" icon={AlertTriangle} accent="rose" />
        <MetricCard label="Linked Projects" value={linkedProjects} hint="Projects represented in this board" icon={FolderKanban} accent="violet" />
      </div>

      <SurfaceCard className="p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by task, project, or assignee" className="pl-10" />
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | SavedTaskStatus)}>
              <option value="all">All statuses</option>
              {TASK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <SelectInput value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
              <option value="all">All assignees</option>
              <option value="">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </SelectInput>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <FieldLabel>Project</FieldLabel>
            <SelectInput value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectInput>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="secondary" size="sm" iconLeft={<FolderPlus className="h-4 w-4" />} onClick={() => { resetProjectForm(); setShowProjectModal(true); }}>
              Add Project
            </Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {TASK_STATUS_OPTIONS.map((section) => {
          const columnTasks = filteredTasks.filter((task) => task.status === section.value);
          return (
            <SurfaceCard key={section.value} className="overflow-hidden p-0">
              <div className={cn('border-b px-5 py-4', section.accent === 'sky' && 'border-sky-100 bg-sky-50/70', section.accent === 'amber' && 'border-amber-100 bg-amber-50/70', section.accent === 'emerald' && 'border-emerald-100 bg-emerald-50/70')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.description}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-950">{section.label}</h2>
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white/90 px-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{columnTasks.length}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => openTaskComposer(section.value)}>
                    Add Task
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {columnTasks.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">No tasks in {section.label.toLowerCase()} right now.</div> : null}

                {columnTasks.map((task) => {
                  const dueMeta = getDueMeta(task);
                  const projectName = task.project?.name || 'No project';
                  const assigneeName = task.assignee?.name || 'Unassigned';
                  return (
                    <article key={task.id} className={cn('rounded-[24px] border p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-32px_rgba(15,23,42,0.26)]', dueMeta.tone === 'overdue' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white/90')}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', statusBadgeClasses[task.status as SavedTaskStatus])}>{titleCase(task.status)}</span>
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', priorityBadgeClasses[task.priority || 'medium'])}>{titleCase(task.priority || 'medium')} priority</span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">{task.title}</h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{task.description || 'No description yet. Add context so the assignee knows what done looks like.'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label={`Edit ${task.title}`} onClick={() => openEditTask(task)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" aria-label={`Delete ${task.title}`} onClick={() => void handleDelete(task.id)} className="rounded-full p-2 text-slate-400 transition hover:bg-rose-100 hover:text-rose-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setProjectFilter((current) => (current === String(task.project_id) ? 'all' : String(task.project_id)))}
                          className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition', projectFilter === String(task.project_id) ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
                        >
                          <FolderKanban className="h-3.5 w-3.5" />
                          {projectName}
                        </button>
                        <span className={cn('inline-flex rounded-full px-3 py-1.5 text-xs font-semibold', dueBadgeClasses[dueMeta.tone])}>{dueMeta.label}</span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TaskDetailItem icon={UserRound} label="Assignee" value={assigneeName} />
                        <TaskDetailItem icon={CalendarDays} label="Due Date" value={task.due_date ? formatDate(task.due_date) : 'No deadline'} />
                        <TaskDetailItem icon={TimerReset} label="Estimate" value={formatMinutes(task.estimated_time)} />
                        <TaskDetailItem icon={Clock3} label="Updated" value={formatDateTime(task.updated_at)} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                        {task.status !== 'todo' ? <Button variant="ghost" size="sm" iconLeft={<CircleDot className="h-4 w-4" />} onClick={() => void handleStatusChange(task, 'todo')} disabled={updateStatusMutation.isPending}>Move To Do</Button> : null}
                        {task.status !== 'in_progress' ? <Button variant="ghost" size="sm" iconLeft={<Clock3 className="h-4 w-4" />} onClick={() => void handleStatusChange(task, 'in_progress')} disabled={updateStatusMutation.isPending}>Start Work</Button> : null}
                        {task.status !== 'done' ? <Button variant="ghost" size="sm" iconLeft={<CheckCircle2 className="h-4 w-4" />} onClick={() => void handleStatusChange(task, 'done')} disabled={updateStatusMutation.isPending}>Mark Done</Button> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {showTaskModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Task composer</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{editingTask ? 'Edit task details' : 'Create a new task'}</h2>
                <p className="mt-2 text-sm text-slate-500">Add the task, link it to a project, then capture enough context that the assignee can act without guessing.</p>
              </div>
              <button type="button" aria-label="Close task modal" onClick={() => setShowTaskModal(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel>Task Title</FieldLabel>
                  <TextInput required value={taskFormData.title} onChange={(event) => setTaskFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Prepare weekly performance review" />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project</label>
                    <button type="button" onClick={() => { resetProjectForm(); setShowProjectModal(true); }} className="text-xs font-semibold text-sky-600 transition hover:text-sky-700">
                      + Add project
                    </button>
                  </div>
                  <SelectInput required value={taskFormData.project_id} onChange={(event) => setTaskFormData((current) => ({ ...current, project_id: event.target.value }))}>
                    <option value="">Select project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </SelectInput>
                  {projects.length === 0 ? <p className="mt-2 text-xs text-amber-700">Create a project first so this task has a place to live.</p> : null}
                </div>

                <div>
                  <FieldLabel>Assignee</FieldLabel>
                  <SelectInput value={taskFormData.assignee_id} onChange={(event) => setTaskFormData((current) => ({ ...current, assignee_id: event.target.value }))}>
                    <option value="">Unassigned</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </SelectInput>
                </div>

                <div>
                  <FieldLabel>Status</FieldLabel>
                  <SelectInput value={taskFormData.status} onChange={(event) => setTaskFormData((current) => ({ ...current, status: event.target.value as SavedTaskStatus }))}>
                    {TASK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectInput>
                </div>

                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectInput value={taskFormData.priority} onChange={(event) => setTaskFormData((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                    {TASK_PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{titleCase(priority)}</option>)}
                  </SelectInput>
                </div>

                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <TextInput type="date" value={taskFormData.due_date} onChange={(event) => setTaskFormData((current) => ({ ...current, due_date: event.target.value }))} />
                </div>

                <div>
                  <FieldLabel>Estimated Time</FieldLabel>
                  <TextInput type="number" min="0" value={taskFormData.estimated_time} onChange={(event) => setTaskFormData((current) => ({ ...current, estimated_time: event.target.value }))} placeholder="120" />
                  <p className="mt-2 text-xs text-slate-500">Enter minutes so the estimate is easy to compare later.</p>
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <TextareaInput rows={5} value={taskFormData.description} onChange={(event) => setTaskFormData((current) => ({ ...current, description: event.target.value }))} placeholder="Capture acceptance criteria, blockers, links, or the exact outcome expected." />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-950">Task summary</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TaskSummaryItem label="Project" value={taskFormData.project_id ? projects.find((project) => String(project.id) === taskFormData.project_id)?.name || 'Selected project' : 'Not selected'} />
                  <TaskSummaryItem label="Assignee" value={taskFormData.assignee_id ? users.find((user) => String(user.id) === taskFormData.assignee_id)?.name || 'Selected assignee' : 'Unassigned'} />
                  <TaskSummaryItem label="Estimate" value={taskFormData.estimated_time ? formatMinutes(Number(taskFormData.estimated_time)) : 'No estimate'} />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setShowTaskModal(false)} disabled={saveTaskMutation.isPending}>Cancel</Button>
                <Button type="submit" disabled={saveTaskMutation.isPending || projects.length === 0}>{saveTaskMutation.isPending ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showProjectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Project quick add</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Create a project without leaving tasks</h2>
                <p className="mt-2 text-sm text-slate-500">Add the project here and it will become available in the task form immediately.</p>
              </div>
              <button type="button" aria-label="Close project modal" onClick={() => setShowProjectModal(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="mt-6 space-y-4">
              <div>
                <FieldLabel>Project Name</FieldLabel>
                <TextInput required value={projectFormData.name} onChange={(event) => setProjectFormData((current) => ({ ...current, name: event.target.value }))} placeholder="Quarterly Ops Dashboard" />
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <TextareaInput rows={4} value={projectFormData.description} onChange={(event) => setProjectFormData((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the goal, scope, or client expectation." />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <SelectInput value={projectFormData.status} onChange={(event) => setProjectFormData((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>
                    {PROJECT_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Budget</FieldLabel>
                  <TextInput type="number" min="0" step="0.01" value={projectFormData.budget} onChange={(event) => setProjectFormData((current) => ({ ...current, budget: event.target.value }))} placeholder="1500" />
                </div>
              </div>

              <div>
                <FieldLabel>Deadline</FieldLabel>
                <TextInput type="date" value={projectFormData.deadline} onChange={(event) => setProjectFormData((current) => ({ ...current, deadline: event.target.value }))} />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setShowProjectModal(false)} disabled={saveProjectMutation.isPending}>Cancel</Button>
                <Button type="submit" disabled={saveProjectMutation.isPending}>{saveProjectMutation.isPending ? 'Saving...' : 'Create Project'}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskDetailItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
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

function TaskSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white px-4 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.3)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
