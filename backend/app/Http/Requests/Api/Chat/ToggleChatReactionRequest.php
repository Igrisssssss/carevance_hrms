<?php

namespace App\Http\Requests\Api\Chat;

use App\Http\Requests\Api\ApiFormRequest;

class ToggleChatReactionRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'emoji' => 'required|string|max:16',
        ];
    }
}
