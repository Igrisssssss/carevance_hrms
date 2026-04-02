<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Idle Activity Threshold
    |--------------------------------------------------------------------------
    |
    | Number of continuous idle seconds before tracker events are labeled as
    | idle activity instead of app/url activity.
    |
    */
    'idle_track_threshold_seconds' => (int) env('IDLE_TRACK_THRESHOLD_SECONDS', 180),

    /*
    |--------------------------------------------------------------------------
    | Idle Auto-Stop Threshold
    |--------------------------------------------------------------------------
    |
    | Number of continuous idle seconds required before the backend accepts
    | an automatic timer stop for idle inactivity.
    |
    */
    'idle_auto_stop_threshold_seconds' => (int) env('IDLE_AUTO_STOP_THRESHOLD_SECONDS', 300),
];
