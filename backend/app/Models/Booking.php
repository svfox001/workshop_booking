<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'customer_email',
        'rego',
        'service_bay',
        'starts_at',
        'ends_at',
        'status',
        'notes',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'status' => BookingStatus::class,
        ];
    }

    /**
     * Registrations are stored trimmed and uppercase so "abc123 " and "ABC123" match.
     */
    protected function rego(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => $value === null ? null : mb_strtoupper(trim($value)),
        );
    }
}
