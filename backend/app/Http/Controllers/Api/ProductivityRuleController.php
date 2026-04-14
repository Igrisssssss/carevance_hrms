<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductivityRule;
use App\Services\Monitoring\ProductivityClassifier;
use Illuminate\Http\Request;

class ProductivityRuleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $rules = ProductivityRule::query()
            ->when($user?->organization_id, function ($query) use ($user) {
                $query->where(function ($inner) use ($user) {
                    $inner->whereNull('organization_id')
                        ->orWhere('organization_id', $user->organization_id);
                });
            })
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $rules,
            'meta' => [
                'target_types' => ['app', 'domain', 'title_pattern', 'url_pattern'],
                'match_modes' => ['exact', 'contains', 'starts_with', 'ends_with', 'regex'],
                'classifications' => ['productive', 'unproductive', 'neutral', 'context_dependent'],
                'scope_types' => ['global', 'workspace', 'group', 'user'],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRule($request);
        $validated['organization_id'] = $request->user()?->organization_id;

        $rule = ProductivityRule::create($validated);

        return response()->json($rule, 201);
    }

    public function update(Request $request, ProductivityRule $productivityRule)
    {
        $this->authorizeRule($request, $productivityRule);
        $productivityRule->update($this->validateRule($request));

        return response()->json($productivityRule->fresh());
    }

    public function destroy(Request $request, ProductivityRule $productivityRule)
    {
        $this->authorizeRule($request, $productivityRule);
        $productivityRule->delete();

        return response()->json(['message' => 'Rule deleted successfully.']);
    }

    public function test(Request $request, ProductivityClassifier $classifier)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
            'window_title' => ['nullable', 'string'],
            'app_name' => ['nullable', 'string'],
            'url' => ['nullable', 'string'],
        ]);

        return response()->json($classifier->classifyContext([
            'raw_name' => (string) ($validated['name'] ?? ''),
            'activity_type' => (string) ($validated['type'] ?? 'app'),
            'window_title' => (string) ($validated['window_title'] ?? ''),
            'app_name' => (string) ($validated['app_name'] ?? ''),
            'url' => (string) ($validated['url'] ?? ''),
            'organization_id' => (int) ($request->user()?->organization_id ?? 0),
            'user_id' => (int) ($request->user()?->id ?? 0),
            'group_ids' => $request->user()?->groups?->pluck('id')->all() ?? [],
        ]));
    }

    private function validateRule(Request $request): array
    {
        $required = $request->isMethod('post') ? 'required' : 'sometimes';

        return $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'target_type' => [$required, 'in:app,domain,title_pattern,url_pattern'],
            'match_mode' => [$required, 'in:exact,contains,starts_with,ends_with,regex'],
            'target_value' => [$required, 'string', 'max:255'],
            'classification' => [$required, 'in:productive,unproductive,neutral,context_dependent'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'scope_type' => [$required, 'in:global,workspace,group,user'],
            'scope_id' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    private function authorizeRule(Request $request, ProductivityRule $rule): void
    {
        abort_unless(
            $rule->organization_id === null || $rule->organization_id === (int) $request->user()?->organization_id,
            403,
            'Forbidden'
        );
    }
}
