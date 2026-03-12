<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditLogService
{
    private const SENSITIVE_KEYS = [
        'password',
        'current_password',
        'new_password',
        'new_password_confirmation',
        'token',
        'authorization',
        'raw_response',
        'abilities',
        'checkout_url',
    ];

    public function log(
        string $action,
        ?User $actor = null,
        Model|string|null $target = null,
        array $metadata = [],
        ?Request $request = null,
        ?int $organizationId = null,
    ): ?AuditLog {
        [$targetType, $targetId] = $this->resolveTarget($target);

        try {
            return AuditLog::create([
                'organization_id' => $organizationId ?? $actor?->organization_id ?? $this->resolveOrganizationIdFromTarget($target),
                'actor_user_id' => $actor?->id,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'metadata' => $this->sanitizeMetadata($metadata),
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Audit log write failed.', [
                'action' => $action,
                'actor_user_id' => $actor?->id,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function resolveTarget(Model|string|null $target): array
    {
        if ($target instanceof Model) {
            return [class_basename($target), $target->getKey()];
        }

        if (is_string($target) && $target !== '') {
            return [$target, null];
        }

        return [null, null];
    }

    private function resolveOrganizationIdFromTarget(Model|string|null $target): ?int
    {
        if (!$target instanceof Model) {
            return null;
        }

        $organizationId = data_get($target, 'organization_id');

        return is_numeric($organizationId) ? (int) $organizationId : null;
    }

    private function sanitizeMetadata(array $metadata): array
    {
        $sanitized = $this->sanitizeValue($metadata);

        return is_array($sanitized) ? $sanitized : [];
    }

    private function sanitizeValue(mixed $value, ?string $key = null): mixed
    {
        if ($key !== null && in_array(mb_strtolower($key), self::SENSITIVE_KEYS, true)) {
            return '[REDACTED]';
        }

        if (is_array($value)) {
            $result = [];

            foreach ($value as $childKey => $childValue) {
                $result[$childKey] = $this->sanitizeValue($childValue, is_string($childKey) ? $childKey : null);
            }

            return $result;
        }

        if ($value instanceof Model) {
            return $this->sanitizeValue(Arr::except($value->toArray(), ['password', 'remember_token']));
        }

        if (is_object($value) && method_exists($value, 'toArray')) {
            return $this->sanitizeValue($value->toArray());
        }

        if (is_string($value) && mb_strlen($value) > 1500) {
            return mb_substr($value, 0, 1500).'...';
        }

        return $value;
    }
}
