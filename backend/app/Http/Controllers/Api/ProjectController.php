<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index()
    {
        $user = request()->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $projects = Project::with('tasks')
            ->where('organization_id', $user->organization_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'budget' => 'nullable|numeric',
            'deadline' => 'nullable|date',
            'status' => 'nullable|in:active,completed,archived',
        ]);

        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        $project = Project::create([
            'name' => $request->name,
            'description' => $request->description,
            'budget' => $request->budget,
            'deadline' => $request->deadline,
            'status' => $request->status ?? 'active',
            'organization_id' => $user->organization_id,
        ]);

        return response()->json($project, 201);
    }

    public function show(Project $project)
    {
        if (!$this->canAccessProject($project)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $project->load('tasks', 'timeEntries');
        return response()->json($project);
    }

    public function update(Request $request, Project $project)
    {
        if (!$this->canAccessProject($project)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'budget' => 'nullable|numeric',
            'deadline' => 'nullable|date',
            'status' => 'nullable|in:active,completed,archived',
        ]);

        $project->update($request->only(['name', 'description', 'budget', 'deadline', 'status']));

        return response()->json($project);
    }

    public function destroy(Project $project)
    {
        if (!$this->canAccessProject($project)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $project->delete();

        return response()->json(['message' => 'Project deleted']);
    }

    public function timeEntries(int $id, Request $request)
    {
        $project = $this->findScopedProject($id);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $timeEntries = $project->timeEntries()
            ->with('task', 'user')
            ->when($request->start_date, fn (Builder $q, string $start) => $q->whereDate('start_time', '>=', $start))
            ->when($request->end_date, fn (Builder $q, string $end) => $q->whereDate('start_time', '<=', $end))
            ->orderBy('start_time', 'desc')
            ->get();

        return response()->json($timeEntries);
    }

    public function tasks(int $id, Request $request)
    {
        $project = $this->findScopedProject($id);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $tasks = $project->tasks()
            ->with('assignee')
            ->when($request->status, fn (Builder $q, string $status) => $q->where('status', $status))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tasks);
    }

    public function stats(int $id, Request $request)
    {
        $project = $this->findScopedProject($id);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $timeEntries = $project->timeEntries()
            ->when($request->start_date, fn (Builder $q, string $start) => $q->whereDate('start_time', '>=', $start))
            ->when($request->end_date, fn (Builder $q, string $end) => $q->whereDate('start_time', '<=', $end))
            ->get();

        $totalDuration = (int) $timeEntries->sum('duration');
        $billableDuration = (int) $timeEntries->where('billable', true)->sum('duration');

        return response()->json([
            'project_id' => $project->id,
            'entries_count' => $timeEntries->count(),
            'tasks_count' => $project->tasks()->count(),
            'completed_tasks' => $project->tasks()->where('status', 'done')->count(),
            'total_duration' => $totalDuration,
            'billable_duration' => $billableDuration,
            'total_hours' => round($totalDuration / 3600, 2),
            'billable_hours' => round($billableDuration / 3600, 2),
        ]);
    }

    private function canAccessProject(Project $project): bool
    {
        $user = request()->user();
        return $user && $user->organization_id === $project->organization_id;
    }

    private function findScopedProject(int $id): ?Project
    {
        $user = request()->user();
        if (!$user || !$user->organization_id) {
            return null;
        }

        return Project::where('organization_id', $user->organization_id)
            ->where('id', $id)
            ->first();
    }
}
