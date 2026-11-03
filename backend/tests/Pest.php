<?php

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests run against an in-memory SQLite database. The concurrency
| suite (tests/Concurrency) deliberately does not use RefreshDatabase: it
| spawns separate PHP processes against a file-based database.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Concurrency');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * A valid booking payload, with times in workshop-local time unless overridden.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function bookingPayload(array $overrides = []): array
{
    return array_merge([
        'customer_name' => 'Jane Citizen',
        'customer_email' => 'jane@example.com',
        'rego' => 'ABC123',
        'service_bay' => 'Bay 1',
        'starts_at' => '2026-11-10T09:00',
        'ends_at' => '2026-11-10T11:00',
        'notes' => null,
    ], $overrides);
}

/**
 * Create a booking through the API and return its stored model.
 *
 * @param  array<string, mixed>  $overrides
 */
function createBooking(array $overrides = []): Booking
{
    $response = test()->postJson('/api/bookings', bookingPayload($overrides))->assertCreated();

    return Booking::findOrFail($response->json('data.id'));
}
