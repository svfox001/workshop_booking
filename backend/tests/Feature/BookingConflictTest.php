<?php

use App\Models\Booking;

it('rejects an overlapping booking in the same bay with a 409', function () {
    createBooking(['starts_at' => '2026-11-10T09:00', 'ends_at' => '2026-11-10T11:00']);

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T10:00',
        'ends_at' => '2026-11-10T12:00',
    ]))->assertConflict()
        ->assertJsonStructure(['message', 'errors' => ['starts_at']]);

    expect(Booking::count())->toBe(1);
});

it('rejects overlaps of every shape', function (string $startsAt, string $endsAt) {
    createBooking(['starts_at' => '2026-11-10T09:00', 'ends_at' => '2026-11-10T11:00']);

    $this->postJson('/api/bookings', bookingPayload(['starts_at' => $startsAt, 'ends_at' => $endsAt]))
        ->assertConflict();
})->with([
    'identical' => ['2026-11-10T09:00', '2026-11-10T11:00'],
    'inside' => ['2026-11-10T09:30', '2026-11-10T10:30'],
    'surrounding' => ['2026-11-10T08:00', '2026-11-10T12:00'],
    'overlapping start' => ['2026-11-10T08:00', '2026-11-10T09:01'],
    'overlapping end' => ['2026-11-10T10:59', '2026-11-10T13:00'],
]);

it('allows overlapping bookings in different bays', function () {
    createBooking(['service_bay' => 'Bay 1']);

    $this->postJson('/api/bookings', bookingPayload(['service_bay' => 'Bay 2']))->assertCreated();

    expect(Booking::count())->toBe(2);
});

it('does not let a cancelled booking block a new booking', function () {
    createBooking(['status' => 'cancelled']);

    $this->postJson('/api/bookings', bookingPayload())->assertCreated();
});

it('lets a cancelled booking be created over an active one', function () {
    createBooking();

    $this->postJson('/api/bookings', bookingPayload(['status' => 'cancelled']))->assertCreated();
});

it('allows adjacent bookings', function () {
    createBooking(['starts_at' => '2026-11-10T09:00', 'ends_at' => '2026-11-10T11:00']);

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T11:00',
        'ends_at' => '2026-11-10T12:00',
    ]))->assertCreated();

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T08:00',
        'ends_at' => '2026-11-10T09:00',
    ]))->assertCreated();
});

it('updates a booking without conflicting with itself', function () {
    $booking = createBooking(['starts_at' => '2026-11-10T09:00', 'ends_at' => '2026-11-10T11:00']);

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload([
        'starts_at' => '2026-11-10T10:00',
        'ends_at' => '2026-11-10T12:00',
        'status' => 'confirmed',
        'customer_name' => 'Jane Updated',
    ]))->assertOk()
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.customer_name', 'Jane Updated')
        ->assertJsonPath('data.starts_at', '2026-11-09T23:00:00Z');
});

it('rejects an update into an occupied slot', function () {
    createBooking(['starts_at' => '2026-11-10T09:00', 'ends_at' => '2026-11-10T11:00']);
    $other = createBooking(['starts_at' => '2026-11-10T13:00', 'ends_at' => '2026-11-10T14:00']);

    $this->putJson("/api/bookings/{$other->id}", bookingPayload([
        'starts_at' => '2026-11-10T10:00',
        'ends_at' => '2026-11-10T12:00',
        'status' => 'pending',
    ]))->assertConflict()
        ->assertJsonValidationErrors(['starts_at']);

    expect($other->fresh()->starts_at->toIso8601ZuluString())->toBe('2026-11-10T02:00:00Z');
});

it('rejects moving a booking into an occupied bay', function () {
    createBooking(['service_bay' => 'Bay 2']);
    $other = createBooking(['service_bay' => 'Bay 1']);

    $this->putJson("/api/bookings/{$other->id}", bookingPayload(['service_bay' => 'Bay 2', 'status' => 'pending']))
        ->assertConflict();

    expect($other->fresh()->service_bay)->toBe('Bay 1');
});

it('rejects reactivating a cancelled booking into an occupied slot', function () {
    $cancelled = createBooking(['status' => 'cancelled']);
    createBooking();

    $this->putJson("/api/bookings/{$cancelled->id}", bookingPayload(['status' => 'pending']))
        ->assertConflict();
    $this->putJson("/api/bookings/{$cancelled->id}", bookingPayload(['status' => 'confirmed']))
        ->assertConflict();

    expect($cancelled->fresh()->status->value)->toBe('cancelled');
});

it('frees the slot when a booking is cancelled', function () {
    $booking = createBooking();

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload(['status' => 'cancelled']))->assertOk();

    $this->postJson('/api/bookings', bookingPayload())->assertCreated();
});

it('detects the same time expressed with different UTC offsets as a conflict', function () {
    // 09:00 in Sydney daylight time (UTC+11) is 22:00Z the previous day.
    createBooking(['starts_at' => '2026-11-10T09:00:00+11:00', 'ends_at' => '2026-11-10T11:00:00+11:00']);

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-09T22:00:00Z',
        'ends_at' => '2026-11-09T23:00:00Z',
    ]))->assertConflict();

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T08:30:00+10:00',
        'ends_at' => '2026-11-10T09:00:00+10:00',
    ]))->assertConflict();

    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T10:00',
        'ends_at' => '2026-11-10T10:30',
    ]))->assertConflict();
});

it('records a lock row for each bay that has been written', function () {
    createBooking(['service_bay' => 'Bay 3']);
    $booking = createBooking(['service_bay' => 'Bay 1']);

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload(['service_bay' => 'Bay 2', 'status' => 'pending']))
        ->assertOk();

    $this->assertDatabaseCount('service_bay_locks', 3);
});
