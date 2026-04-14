<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\ProductivityRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductivityRuleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_productivity_rules(): void
    {
        $organization = Organization::create(['name' => 'Acme', 'slug' => 'acme']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@acme.test',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/settings/productivity-rules', [
            'name' => 'VS Code',
            'target_type' => 'app',
            'match_mode' => 'contains',
            'target_value' => 'vscode',
            'classification' => 'productive',
            'priority' => 400,
            'scope_type' => 'workspace',
            'scope_id' => $organization->id,
            'is_active' => true,
        ], $this->apiHeadersFor($admin))->assertCreated();

        $rule = ProductivityRule::firstOrFail();

        $this->putJson("/api/settings/productivity-rules/{$rule->id}", [
            'classification' => 'neutral',
        ], $this->apiHeadersFor($admin))->assertOk();

        $this->postJson('/api/settings/productivity-rules/test', [
            'name' => 'Visual Studio Code',
            'type' => 'app',
        ], $this->apiHeadersFor($admin))->assertOk()->assertJsonStructure(['classification']);
    }
}
