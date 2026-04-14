<?php

namespace Database\Seeders;

use App\Models\ProductivityRule;
use Illuminate\Database\Seeder;

class ProductivityRuleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ((array) config('productivity_monitoring.default_rules', []) as $rule) {
            ProductivityRule::updateOrCreate(
                [
                    'organization_id' => null,
                    'scope_type' => 'global',
                    'scope_id' => null,
                    'target_type' => $rule['target_type'],
                    'match_mode' => $rule['match_mode'],
                    'target_value' => $rule['target_value'],
                ],
                [
                    'name' => $rule['name'] ?? null,
                    'classification' => $rule['classification'],
                    'priority' => $rule['priority'] ?? 100,
                    'is_active' => true,
                    'reason' => $rule['reason'] ?? null,
                    'notes' => 'Default productivity rule',
                ]
            );
        }
    }
}
