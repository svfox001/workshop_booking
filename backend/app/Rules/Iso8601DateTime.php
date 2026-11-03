<?php

namespace App\Rules;

use App\Support\WorkshopTime;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Iso8601DateTime implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (WorkshopTime::parse($value) === null) {
            $fail('The :attribute field must be a valid ISO 8601 date-time.');
        }
    }
}
