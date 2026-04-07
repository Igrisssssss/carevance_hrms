<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\ApiFormRequest;

class ValidateResetTokenRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email', ''))),
            'token' => trim((string) $this->input('token', '')),
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|max:255',
            'token' => 'required|string',
        ];
    }
}
