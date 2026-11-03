<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    public function definition(): array
    {
        $startsAt = CarbonImmutable::instance($this->faker->dateTimeBetween('-1 month', '+1 month', 'UTC'))
            ->setTime($this->faker->numberBetween(0, 23), 0);

        return [
            'customer_name' => $this->faker->name(),
            'customer_email' => $this->faker->safeEmail(),
            'rego' => strtoupper($this->faker->bothify('???###')),
            'service_bay' => $this->faker->randomElement(config('workshop.service_bays')),
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->addHours(2),
            'status' => BookingStatus::Pending,
            'notes' => null,
        ];
    }

    public function status(BookingStatus $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
