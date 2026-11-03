<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;
use Throwable;

class BookingLockTimeoutException extends RuntimeException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('The booking schedule is busy. Please try again shortly.', 0, $previous);
    }

    public function render(): JsonResponse
    {
        return response()->json(
            ['message' => $this->getMessage()],
            503,
            ['Retry-After' => (string) config('workshop.lock_retry_after')],
        );
    }
}
