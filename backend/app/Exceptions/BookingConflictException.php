<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class BookingConflictException extends RuntimeException
{
    public function __construct(public readonly string $serviceBay)
    {
        parent::__construct("{$serviceBay} is already booked for part of this time.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'errors' => [
                'starts_at' => [$this->getMessage().' Choose another time or service bay.'],
            ],
        ], 409);
    }
}
