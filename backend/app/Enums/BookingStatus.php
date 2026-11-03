<?php

namespace App\Enums;

enum BookingStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';

    /**
     * Whether a booking in this status occupies its service bay.
     */
    public function isActive(): bool
    {
        return $this !== self::Cancelled;
    }

    /**
     * Statuses that occupy a service bay and can therefore conflict.
     *
     * @return list<string>
     */
    public static function activeValues(): array
    {
        return array_values(array_map(
            fn (self $status) => $status->value,
            array_filter(self::cases(), fn (self $status) => $status->isActive()),
        ));
    }
}
