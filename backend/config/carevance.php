<?php

return [
    'frontend_url' => rtrim((string) env('FRONTEND_APP_URL', env('FRONTEND_URL', 'http://localhost:5173')), '/'),

    'trial_days' => (int) env('SAAS_TRIAL_DAYS', 14),

    'default_plan' => (string) env('SAAS_DEFAULT_PLAN', 'starter'),

    'default_billing_cycle' => (string) env('SAAS_DEFAULT_BILLING_CYCLE', 'monthly'),

    'invitation_expiration_hours' => (int) env('INVITATION_EXPIRATION_HOURS', 72),

    'manager_can_invite_employees' => filter_var(
        env('MANAGER_CAN_INVITE_EMPLOYEES', true),
        FILTER_VALIDATE_BOOL
    ),

    'sales_email' => (string) env('SALES_CONTACT_EMAIL', 'sales@carevance.example'),

    'plans' => [
        'starter' => [
            'label' => 'Starter',
            'description' => 'For smaller teams rolling out structured HR and operations workflows.',
            'trial_available' => true,
            'contact_sales_only' => false,
        ],
        'growth' => [
            'label' => 'Growth',
            'description' => 'For scaling teams that need stronger reporting, approvals, and controls.',
            'trial_available' => true,
            'contact_sales_only' => false,
        ],
        'enterprise' => [
            'label' => 'Enterprise',
            'description' => 'For larger organizations that want custom rollout, controls, and support.',
            'trial_available' => false,
            'contact_sales_only' => true,
        ],
    ],
];
