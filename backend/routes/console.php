<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('screenshots:health-check', function () {
    $diskName = 'screenshots';
    $ttlMinutes = max(1, (int) config('screenshots.url_ttl_minutes', 30));
    $appUrl = (string) config('app.url', '');
    $isProduction = app()->environment('production');

    $this->line('Screenshot pipeline health check');
    $this->line('APP_URL: '.$appUrl);
    $this->line('TTL minutes: '.$ttlMinutes);

    if ($isProduction && Str::contains(Str::lower($appUrl), ['localhost', '127.0.0.1'])) {
        $this->error('APP_URL points to localhost in production. Update it before continuing.');

        return 1;
    }

    if ($ttlMinutes < 5) {
        $this->warn('SCREENSHOT_URL_TTL_MINUTES is below 5. Consider using at least 30.');
    }

    try {
        $disk = Storage::disk($diskName);
        $probePath = '__health/'.Str::uuid().'.txt';
        $probeBody = 'ok';

        $disk->put($probePath, $probeBody);
        $canReadBack = $disk->exists($probePath) && $disk->get($probePath) === $probeBody;
        $disk->delete($probePath);

        if (! $canReadBack) {
            $this->error('Screenshot disk write/read check failed.');

            return 1;
        }
    } catch (\Throwable $e) {
        $this->error('Screenshot disk check failed: '.$e->getMessage());

        return 1;
    }

    $signedPath = URL::temporarySignedRoute(
        'screenshots.file',
        now()->addMinutes($ttlMinutes),
        ['screenshot' => 1],
        absolute: false
    );

    if (! Str::contains($signedPath, ['expires=', 'signature='])) {
        $this->error('Signed URL generation check failed.');

        return 1;
    }

    $this->info('OK: screenshot storage and signed URL checks passed.');

    return 0;
})->purpose('Validate screenshot storage and signed URL configuration');

Artisan::command('idle:health-check', function () {
    $idleTrackThreshold = max(30, (int) config('time_tracking.idle_track_threshold_seconds', 180));
    $idleAutoStopThreshold = max(60, (int) config('time_tracking.idle_auto_stop_threshold_seconds', 300));
    $queueDriver = (string) config('queue.default', 'sync');
    $cacheStore = (string) config('cache.default', 'file');

    $this->line('Idle pipeline health check');
    $this->line('Idle track threshold: '.$idleTrackThreshold.' seconds');
    $this->line('Idle auto-stop threshold: '.$idleAutoStopThreshold.' seconds');
    $this->line('Queue driver: '.$queueDriver);
    $this->line('Cache store: '.$cacheStore);

    if ($idleAutoStopThreshold < $idleTrackThreshold) {
        $this->error('Idle auto-stop threshold cannot be lower than idle track threshold.');

        return 1;
    }

    if (app()->environment('production') && $queueDriver === 'sync') {
        $this->warn('Queue driver is sync in production. Idle auto-stop emails will run inline.');
    }

    try {
        $probeKey = 'idle-health-check:'.Str::uuid();
        Cache::put($probeKey, true, now()->addMinute());
        Cache::forget($probeKey);
    } catch (\Throwable $exception) {
        $this->warn('Cache smoke test failed. Idle stop still works, but email dedupe may be weaker.');
        $this->warn($exception->getMessage());
    }

    $this->info('OK: idle threshold and dependency checks passed.');

    return 0;
})->purpose('Validate idle auto-stop configuration and dependencies');
