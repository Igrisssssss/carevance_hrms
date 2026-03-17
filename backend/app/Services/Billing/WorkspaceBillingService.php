<?php

namespace App\Services\Billing;

use App\Models\Organization;

class WorkspaceBillingService
{
    public function snapshot(?Organization $organization): ?array
    {
        if (!$organization) {
            return null;
        }

        $plans = config('carevance.plans', []);
        $planCode = (string) ($organization->plan_code ?: config('carevance.default_plan', 'starter'));
        $planConfig = $plans[$planCode] ?? [];
        $status = (string) ($organization->subscription_status ?: 'trial');
        $trialEndsAt = $organization->trial_ends_at ?? $organization->subscription_expires_at;

        return [
            'plan' => [
                'code' => $planCode,
                'name' => $planConfig['label'] ?? ucfirst($planCode),
                'description' => $planConfig['description'] ?? null,
                'status' => $status,
                'billing_cycle' => $organization->billing_cycle,
                'subscription_intent' => $organization->subscription_intent ?? ($status === 'trial' ? 'trial' : 'paid'),
                'is_trial' => $status === 'trial',
                'trial_end_date' => $trialEndsAt?->toIso8601String(),
                'renewal_date' => $organization->subscription_expires_at?->toDateString()
                    ?? $trialEndsAt?->toDateString(),
                'contact_sales_only' => (bool) ($planConfig['contact_sales_only'] ?? false),
            ],
            'workspace' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'owner_user_id' => $organization->owner_user_id,
            ],
        ];
    }
}
