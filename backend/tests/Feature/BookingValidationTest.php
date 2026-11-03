<?php

use App\Models\Booking;

it('requires every mandatory field', function () {
    $this->postJson('/api/bookings', [])
        ->assertUnprocessable()
        ->assertJsonStructure(['message', 'errors'])
        ->assertJsonValidationErrors([
            'customer_name', 'customer_email', 'rego', 'service_bay', 'starts_at', 'ends_at',
        ]);

    expect(Booking::count())->toBe(0);
});

it('rejects an invalid email', function () {
    $this->postJson('/api/bookings', bookingPayload(['customer_email' => 'not-an-email']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['customer_email']);
});

it('enforces field lengths', function () {
    $this->postJson('/api/bookings', bookingPayload([
        'customer_name' => str_repeat('a', 256),
        'customer_email' => str_repeat('a', 250).'@example.com',
        'rego' => str_repeat('A', 21),
        'notes' => str_repeat('n', 2001),
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors(['customer_name', 'customer_email', 'rego', 'notes']);
});

it('measures rego length after trimming', function () {
    $this->postJson('/api/bookings', bookingPayload(['rego' => '   '.str_repeat('a', 20).'   ']))
        ->assertCreated()
        ->assertJsonPath('data.rego', str_repeat('A', 20));
});

it('rejects an unknown status', function () {
    $this->postJson('/api/bookings', bookingPayload(['status' => 'done']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

it('rejects a service bay that is not configured', function (string $bay) {
    $this->postJson('/api/bookings', bookingPayload(['service_bay' => $bay]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['service_bay']);
})->with(['bay 1', 'Bay 9', 'BAY 1', '']);

it('rejects an end time that is not after the start time', function (string $endsAt) {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T09:00',
        'ends_at' => $endsAt,
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors(['ends_at']);
})->with([
    'equal' => '2026-11-10T09:00',
    'before' => '2026-11-10T08:00',
    // 09:30+12:00 is 08:30 workshop time (UTC+11), so it is before the start despite the larger clock value.
    'before once normalised to UTC' => '2026-11-10T09:30:00+12:00',
]);

it('compares the range in UTC, not by clock value', function () {
    // 08:30 at UTC+10 is 09:30 in the workshop (UTC+11): after the 09:00 start.
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T09:00',
        'ends_at' => '2026-11-10T08:30:00+10:00',
    ]))->assertCreated();
});

it('rejects date-times that are not ISO 8601', function (string $value) {
    $this->postJson('/api/bookings', bookingPayload(['starts_at' => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['starts_at']);
})->with(['tomorrow', '10/11/2026 09:00', '2026-02-30T09:00', '2026-11-10', '2026-11-10T25:00']);

it('requires status when replacing a booking', function () {
    $booking = createBooking();

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

it('requires all fields when replacing a booking', function () {
    $booking = createBooking();

    $this->putJson("/api/bookings/{$booking->id}", ['status' => 'confirmed'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['customer_name', 'customer_email', 'rego', 'service_bay', 'starts_at', 'ends_at']);
});

it('returns JSON validation errors without an Accept header', function () {
    $this->post('/api/bookings', [])
        ->assertUnprocessable()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonValidationErrors(['customer_name']);
});
