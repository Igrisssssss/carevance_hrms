<?php

namespace App\Http\Requests\Api\Support;

use App\Http\Requests\Api\ApiFormRequest;
use Illuminate\Validation\Rule;

class SubmitBugReportRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => filled($this->input('name')) ? trim((string) $this->input('name')) : null,
            'email' => mb_strtolower(trim((string) $this->input('email', ''))),
            'summary' => trim((string) $this->input('summary', '')),
            'description' => trim((string) $this->input('description', '')),
            'current_path' => filled($this->input('current_path')) ? trim((string) $this->input('current_path')) : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'issue_category' => ['required', 'string', Rule::in(['bug', 'ui', 'performance', 'billing', 'account', 'other'])],
            'summary' => 'required|string|max:255',
            'description' => 'required|string|max:4000',
            'current_path' => 'nullable|string|max:500',
        ];
    }
}
