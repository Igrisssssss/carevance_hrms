<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\ApiFormRequest;

class ForgotPasswordRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email', ''))),
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|max:255',
        ];
    }
}
