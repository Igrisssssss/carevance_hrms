<?php

namespace App\Services\TimeEntries;

use App\Mail\IdleTimerStoppedMail;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class IdleAutoStopMailService
{
    public function send(User $user, int $idleSeconds, CarbonInterface $stoppedAt, ?string $dedupeKey = null): bool
    {
        if (!filled($user->email) || $idleSeconds <= 0) {
            return false;
        }

        if ($dedupeKey && ! Cache::add($dedupeKey, true, now()->addDay())) {
            Log::info('Idle auto-stop email skipped because it was already dispatched.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'idle_seconds' => $idleSeconds,
                'dedupe_key' => $dedupeKey,
            ]);

            return false;
        }

        $displayTimezone = $this->resolveDisplayTimezone($user);
        $idleDurationLabel = $this->formatIdleDuration($idleSeconds);

        try {
            Mail::to($user->email)->queue(
                new IdleTimerStoppedMail(
                    user: $user->loadMissing('organization'),
                    idleSeconds: $idleSeconds,
                    idleDurationLabel: $idleDurationLabel,
                    displayTimezone: $displayTimezone,
                    stoppedAt: $stoppedAt,
                )
            );

            Log::info('Idle auto-stop email queued.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'idle_seconds' => $idleSeconds,
                'idle_duration_label' => $idleDurationLabel,
                'stopped_at' => $stoppedAt->toIso8601String(),
                'dedupe_key' => $dedupeKey,
            ]);

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Idle auto-stop email dispatch failed.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'idle_seconds' => $idleSeconds,
                'dedupe_key' => $dedupeKey,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            if ($dedupeKey) {
                Cache::forget($dedupeKey);
            }
        }

        return false;
    }

    private function formatIdleDuration(int $idleSeconds): string
    {
        if ($idleSeconds < 60) {
            return sprintf('%d second%s', $idleSeconds, $idleSeconds === 1 ? '' : 's');
        }

        $idleMinutes = intdiv($idleSeconds, 60);
        $remainingSeconds = $idleSeconds % 60;

        if ($remainingSeconds === 0) {
            return sprintf('%d minute%s', $idleMinutes, $idleMinutes === 1 ? '' : 's');
        }

        return sprintf(
            '%d minute%s %d second%s',
            $idleMinutes,
            $idleMinutes === 1 ? '' : 's',
            $remainingSeconds,
            $remainingSeconds === 1 ? '' : 's'
        );
    }

    private function resolveDisplayTimezone(User $user): string
    {
        $candidate = is_array($user->settings)
            ? (string) ($user->settings['timezone'] ?? '')
            : '';

        if ($candidate !== '' && in_array($candidate, timezone_identifiers_list(), true)) {
            return $candidate;
        }

        return (string) config('app.timezone', 'UTC');
    }
}
