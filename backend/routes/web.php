<?php

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'carevance-hrms-api',
        'message' => 'API is running',
    ]);
});

// Temporary route for verifying SMTP delivery locally. Remove once SMTP is confirmed.
Route::get('/test-mail', function () {
    if (!app()->isLocal()) {
        abort(404);
    }

    try {
        Mail::raw('CareVance SMTP test email.', function ($message) {
            $message->to((string) env('MAIL_FROM_ADDRESS', 'hello@example.com'))
                ->subject('CareVance SMTP Test');
        });

        return response('Test email sent.', 200);
    } catch (\Throwable $exception) {
        report($exception);

        return response('Failed to send test email.', 500);
    }
});
