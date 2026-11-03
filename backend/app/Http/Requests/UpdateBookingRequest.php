<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use Illuminate\Validation\Rule;

/**
 * PUT replaces the whole booking, so status is required rather than defaulted:
 * omitting it must never silently reactivate a cancelled booking.
 */
class UpdateBookingRequest extends StoreBookingRequest
{
    protected function statusRules(): array
    {
        return ['required', Rule::enum(BookingStatus::class)];
    }
}
