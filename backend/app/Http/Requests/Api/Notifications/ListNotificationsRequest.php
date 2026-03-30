<?php

namespace App\Http\Requests\Api\Notifications;

use App\Http\Requests\Api\ApiFormRequest;

class ListNotificationsRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('unread_only')) {
            return;
        }

        $value = $this->input('unread_only');
        if (! is_string($value)) {
            return;
        }

        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($normalized !== null) {
            $this->merge([
                'unread_only' => $normalized,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'limit' => 'nullable|integer|min:1|max:100',
            'type' => 'nullable|string|max:50',
            'q' => 'nullable|string|max:255',
            'unread_only' => 'nullable|boolean',
        ];
    }
}
