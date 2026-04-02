<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Screenshot Signed URL TTL
    |--------------------------------------------------------------------------
    |
    | Number of minutes that generated screenshot file URLs remain valid.
    | Keep this long enough for normal dashboard usage, but still short-lived.
    |
    */
    'url_ttl_minutes' => (int) env('SCREENSHOT_URL_TTL_MINUTES', 30),
];
