<?php

namespace App\Http\Requests\Api\Chat;

use App\Http\Requests\Api\ApiFormRequest;

class UpdateChatMessageRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'body' => 'required|string|max:4000',
        ];
    }
}
