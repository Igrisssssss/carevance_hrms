<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = request()->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $tasks = Task::with('project', 'assignee')
            ->whereHas('project', function (Builder $query) use ($user) {
                $query->where('organization_id', $user->organization_id);
            })
            ->when($request->filled('project_id'), fn (Builder $query) => $query->where('project_id', (int) $request->project_id))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->status))
            ->when($request->filled('assignee_id'), fn (Builder $query) => $query->where('assignee_id', (int) $request->assignee_id))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'required|exists:projects,id',
            'status' => 'nullable|in:todo,in_progress,done',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignee_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'estimated_time' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();
        $project = Project::find($request->project_id);
        if (!$user || !$project || $project->organization_id !== $user->organization_id) {
            return response()->json(['message' => 'Invalid project for your organization.'], 422);
        }

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'project_id' => $request->project_id,
            'status' => $request->status ?? 'todo',
            'priority' => $request->priority ?? 'medium',
            'assignee_id' => $request->assignee_id,
            'due_date' => $request->due_date,
            'estimated_time' => $request->estimated_time,
        ]);

        return response()->json($task, 201);
    }

    public function show(Task $task)
    {
        if (!$this->canAccessTask($task)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->load('project', 'timeEntries', 'assignee');
        return response()->json($task);
    }

    public function update(Request $request, Task $task)
    {
        if (!$this->canAccessTask($task)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'status' => 'nullable|in:todo,in_progress,done',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assignee_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'estimated_time' => 'nullable|integer|min:0',
        ]);

        $payload = $request->only(['title', 'description', 'project_id', 'status', 'priority', 'assignee_id', 'due_date', 'estimated_time']);

        if (isset($payload['project_id'])) {
            $newProject = Project::find($payload['project_id']);
            $user = $request->user();
            if (!$newProject || !$user || $newProject->organization_id !== $user->organization_id) {
                return response()->json(['message' => 'Invalid project for your organization.'], 422);
            }
        }

        $task->update($payload);

        return response()->json($task);
    }

    public function updateStatus(Request $request, Task $task)
    {
        if (!$this->canAccessTask($task)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => 'required|in:todo,in_progress,done',
        ]);

        $task->update(['status' => $request->status]);

        return response()->json($task);
    }

    public function destroy(Task $task)
    {
        if (!$this->canAccessTask($task)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted']);
    }

    public function timeEntries(int $id)
    {
        $task = $this->findScopedTask($id);
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        return response()->json(
            $task->timeEntries()
                ->with('project', 'user')
                ->orderBy('start_time', 'desc')
                ->get()
        );
    }

    private function canAccessTask(Task $task): bool
    {
        $task->loadMissing('project');
        $user = request()->user();
        return $user && $task->project && $task->project->organization_id === $user->organization_id;
    }

    private function findScopedTask(int $id): ?Task
    {
        $user = request()->user();
        if (!$user || !$user->organization_id) {
            return null;
        }

        return Task::where('id', $id)
            ->whereHas('project', fn (Builder $query) => $query->where('organization_id', $user->organization_id))
            ->first();
    }
}
