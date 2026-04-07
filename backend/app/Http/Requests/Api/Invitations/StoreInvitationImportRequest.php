<?php

namespace App\Http\Requests\Api\Invitations;

use App\Http\Requests\Api\ApiFormRequest;
use Illuminate\Validation\Rule;

class StoreInvitationImportRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'rows' => 'required|array|min:1|max:1000',
            'rows.*.email' => 'required|string|email|max:255',
            'rows.*.role' => ['required', 'string', Rule::in(['admin', 'manager', 'employee', 'client'])],
            'rows.*.group_ids' => 'nullable|array',
            'rows.*.group_ids.*' => 'integer',
            'rows.*.project_ids' => 'nullable|array',
            'rows.*.project_ids.*' => 'integer',
            'rows.*.settings' => 'nullable|array',
            'default_group_ids' => 'nullable|array',
            'default_group_ids.*' => 'integer',
            'default_project_ids' => 'nullable|array',
            'default_project_ids.*' => 'integer',
            'settings' => 'nullable|array',
            'expires_in_hours' => 'nullable|integer|min:1|max:720',
        ];
    }
}
