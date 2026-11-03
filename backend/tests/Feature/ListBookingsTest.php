<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;

it('paginates with Laravel\'s standard structure and 15 per page by default', function () {
    Booking::factory()->count(20)->create();

    $this->getJson('/api/bookings')
        ->assertOk()
        ->assertJsonStructure(['data', 'links' => ['first', 'last', 'prev', 'next'], 'meta' => ['current_page', 'last_page', 'per_page', 'total']])
        ->assertJsonCount(15, 'data')
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonPath('meta.total', 20)
        ->assertJsonPath('meta.last_page', 2);

    $this->getJson('/api/bookings?page=2')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.current_page', 2);
});

it('honours per_page up to 100', function () {
    Booking::factory()->count(101)->create();

    $this->getJson('/api/bookings?per_page=5')->assertJsonCount(5, 'data');
    $this->getJson('/api/bookings?per_page=100')->assertJsonCount(100, 'data');
});

it('rejects per_page above 100 or below 1', function (string $perPage) {
    $this->getJson("/api/bookings?per_page={$perPage}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['per_page']);
})->with(['101', '0', 'abc']);

it('rejects an invalid page', function () {
    $this->getJson('/api/bookings?page=0')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['page']);
});

it('returns an empty page beyond the last page', function () {
    Booking::factory()->count(2)->create();

    $this->getJson('/api/bookings?page=5')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.last_page', 1);
});

it('sorts by starts_at descending with id as a tie-breaker', function () {
    $start = CarbonImmutable::parse('2026-11-10 00:00:00', 'UTC');

    $early = Booking::factory()->create(['starts_at' => $start, 'ends_at' => $start->addHour()]);
    $lateA = Booking::factory()->create(['starts_at' => $start->addDay(), 'ends_at' => $start->addDay()->addHour()]);
    $lateB = Booking::factory()->create(['starts_at' => $start->addDay(), 'ends_at' => $start->addDay()->addHour()]);
    $middle = Booking::factory()->create(['starts_at' => $start->addHours(5), 'ends_at' => $start->addHours(6)]);

    $ids = $this->getJson('/api/bookings')->assertOk()->json('data.*.id');

    expect($ids)->toBe([$lateB->id, $lateA->id, $middle->id, $early->id]);
});

it('filters by status and keeps the filter in pagination links', function () {
    Booking::factory()->count(3)->status(BookingStatus::Confirmed)->create();
    Booking::factory()->count(2)->status(BookingStatus::Cancelled)->create();
    Booking::factory()->count(4)->create();

    $response = $this->getJson('/api/bookings?status=confirmed&per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3);

    expect(collect($response->json('data'))->pluck('status')->unique()->all())->toBe(['confirmed'])
        ->and($response->json('links.next'))->toContain('status=confirmed');

    $this->getJson('/api/bookings?status=cancelled')->assertJsonPath('meta.total', 2);
    $this->getJson('/api/bookings?status=pending')->assertJsonPath('meta.total', 4);
});

it('rejects an invalid status filter with a 422', function () {
    $this->getJson('/api/bookings?status=archived')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});
