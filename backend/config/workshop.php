<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Workshop Timezone
    |--------------------------------------------------------------------------
    |
    | The dealership's local timezone. API date-times sent without a UTC
    | offset are interpreted in this timezone. All values are normalised
    | to UTC before they are compared or stored.
    |
    */

    'timezone' => env('WORKSHOP_TIMEZONE', 'Australia/Sydney'),

    /*
    |--------------------------------------------------------------------------
    | Service Bays
    |--------------------------------------------------------------------------
    |
    | The bays a booking may be assigned to. Values are matched exactly, so
    | "Bay 1" and "bay 1" can never be treated as different bays. Override
    | with a comma-separated WORKSHOP_SERVICE_BAYS environment variable.
    |
    */

    'service_bays' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('WORKSHOP_SERVICE_BAYS', 'Bay 1,Bay 2,Bay 3,Bay 4')),
    ), fn (string $bay) => $bay !== '')),

    /*
    |--------------------------------------------------------------------------
    | Lock Retry-After
    |--------------------------------------------------------------------------
    |
    | Seconds a client should wait before retrying when a service bay lock
    | could not be acquired in time (sent as the Retry-After header).
    |
    */

    'lock_retry_after' => (int) env('WORKSHOP_LOCK_RETRY_AFTER', 2),

];
