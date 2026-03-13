import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, projectApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { FeedbackBanner, PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/PageState';
import { Plus, Edit2, Trash2, Circle, CheckCircle, Clock } from 'lucide-react';
import type { Task } from '@/types';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    project_id: string;
    status: string;
    priority: string;
    due_date: string;
  }>({
    title: '',
    description: '',
    project_id: '',
    status: 'todo',
    priority: 'medium',
    due_date: ''
  });

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      const response = await taskApi.getAll();
      return response.data;
    },
  });

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const response = await projectApi.getAll();
      return response.data;
    },
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      if (editingTask) {
        await taskApi.update(editingTask.id, data);
        return 'Task updated';
      }

      await taskApi.create(data);
      return 'Task created';
    },
    onSuccess: async (message) => {
      setFeedback({ tone: 'success', message });
      setShowModal(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => {
      setFeedback({
        tone: 'error',
        message: mutationError?.response?.data?.message || 'Failed to save task.',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      await taskApi.updateStatus(taskId, status);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => {
      setFeedback({
        tone: 'error',
        message: mutationError?.response?.data?.message || 'Failed to update task status.',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await taskApi.delete(id);
    },
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Task deleted' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
    onError: (mutationError: any) => {
      setFeedback({
        tone: 'error',
        message: mutationError?.response?.data?.message || 'Failed to delete task.',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const data: Partial<Task> = {
      ...formData,
      status: formData.status as Task['status'],
      priority: formData.priority as Task['priority'],
      project_id: formData.project_id ? parseInt(formData.project_id, 10) : undefined,
    };
    await saveTaskMutation.mutateAsync(data);
  };

  const handleStatusChange = async (task: Task, status: string) => {
    setFeedback(null);
    await updateStatusMutation.mutateAsync({ taskId: task.id, status });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    setFeedback(null);
    await deleteTaskMutation.mutateAsync(id);
  };

  const resetForm = () => { setFormData({ title: '', description: '', project_id: '', status: 'todo', priority: 'medium', due_date: '' }); setEditingTask(null); };
  const openEdit = (task: Task) => { setEditingTask(task); setFormData({ title: task.title, description: task.description || '', project_id: task.project_id?.toString() || '', status: task.status, priority: task.priority, due_date: task.due_date?.split('T')[0] || '' }); setShowModal(true); };
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) { case 'done': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isTasksLoading || isProjectsLoading) {
    return <PageLoadingState label="Loading tasks..." />;
  }

  if (isTasksError || isProjectsError) {
    return (
      <PageErrorState
        message={(tasksError as any)?.response?.data?.message || (projectsError as any)?.response?.data?.message || 'Failed to load tasks.'}
        onRetry={() => {
          void refetchTasks();
          void refetchProjects();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Tasks</h1><p className="text-gray-500 mt-1">Manage your tasks</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="h-5 w-5" />New Task</button>
      </div>

      <div className="flex gap-2">
        {['all', 'todo', 'in_progress', 'done'].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</button>)}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? <PageEmptyState title="No tasks found" description="Create a task or change the filter to see more results." /> : filteredTasks.map(task => (
            <div key={task.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <button onClick={() => handleStatusChange(task, task.status === 'done' ? 'todo' : 'done')}>{getStatusIcon(task.status)}</button>
                <div><p className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p><p className="text-sm text-gray-500">{task.project?.name}</p></div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{task.priority}</span>
                <button onClick={() => openEdit(task)} className="p-2 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(task.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Project</label><select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"><option value="">Select project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="flex gap-2"><div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"><option value="todo">Todo</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div><div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={saveTaskMutation.isPending} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">{saveTaskMutation.isPending ? 'Saving...' : editingTask ? 'Update' : 'Create'}</button></div>
        </form>
      </div></div>}
    </div>
  );
}
