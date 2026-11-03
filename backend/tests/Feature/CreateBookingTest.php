<?php

use App\Enums\BookingStatus;
use App\Models\Booking;

it('creates a booking with a normalised rego and pending status', function () {
    $response = $this->postJson('/api/bookings', bookingPayload([
        'rego' => '  abc 123 ',
        'notes' => 'Check the brakes.',
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.rego', 'ABC 123')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.service_bay', 'Bay 1')
        ->assertJsonPath('data.customer_name', 'Jane Citizen')
        ->assertJsonPath('data.notes', 'Check the brakes.');

    $booking = Booking::sole();
    expect($booking->rego)->toBe('ABC 123')
        ->and($booking->status)->toBe(BookingStatus::Pending);
});

it('stores and returns date-times in UTC, treating offset-less input as workshop time', function () {
    // November in Sydney is daylight time (UTC+11).
    $response = $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-10T09:00',
        'ends_at' => '2026-11-10T10:30:00',
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.starts_at', '2026-11-09T22:00:00Z')
        ->assertJsonPath('data.ends_at', '2026-11-09T23:30:00Z');

    $this->assertDatabaseHas('bookings', [
        'starts_at' => '2026-11-09 22:00:00',
        'ends_at' => '2026-11-09 23:30:00',
    ]);
});

it('honours an explicit UTC offset', function () {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-06-01T08:00:00+10:00',
        'ends_at' => '2026-06-01T09:00:00Z',
    ]))->assertCreated()
        ->assertJsonPath('data.starts_at', '2026-05-31T22:00:00Z')
        ->assertJsonPath('data.ends_at', '2026-06-01T09:00:00Z');
});

it('accepts an explicit status on create', function () {
    $this->postJson('/api/bookings', bookingPayload(['status' => 'confirmed']))
        ->assertCreated()
        ->assertJsonPath('data.status', 'confirmed');
});

it('allows bookings in the past', function () {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2020-01-01T09:00',
        'ends_at' => '2020-01-01T10:00',
    ]))->assertCreated();
});

it('returns a single booking', function () {
    $booking = createBooking();

    $this->getJson("/api/bookings/{$booking->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $booking->id)
        ->assertJsonStructure(['data' => [
            'id', 'customer_name', 'customer_email', 'rego', 'service_bay',
            'starts_at', 'ends_at', 'status', 'notes', 'created_at', 'updated_at',
        ]]);
});

it('deletes a booking', function () {
    $booking = createBooking();

    $this->deleteJson("/api/bookings/{$booking->id}")->assertNoContent();

    expect(Booking::count())->toBe(0);
});

it('lists the configured service bays', function () {
    $this->getJson('/api/service-bays')
        ->assertOk()
        ->assertExactJson(['data' => ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4']]);
});
