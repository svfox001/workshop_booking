<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeZone;

/**
 * Parses API date-times and normalises them to UTC.
 *
 * SQLite compares date-times as text, so every stored value must share one
 * timezone (UTC) and one format ("Y-m-d H:i:s").
 */
class WorkshopTime
{
    public const STORAGE_FORMAT = 'Y-m-d H:i:s';

    /**
     * ISO 8601 date-time: date, "T" (or a space), time to minutes or seconds
     * with optional fraction, and an optional "Z" or ±HH:MM / ±HHMM offset.
     */
    private const PATTERN = '/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?$/i';

    public static function timezone(): DateTimeZone
    {
        return new DateTimeZone(config('workshop.timezone'));
    }

    /**
     * Parse an ISO 8601 string into a UTC instant, or null if it is invalid.
     * Values without an offset are treated as workshop-local time.
     */
    public static function parse(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match(self::PATTERN, trim($value), $m)) {
            return null;
        }

        [, $year, $month, $day, $hour, $minute] = $m;
        $second = $m[6] ?? '';
        $offset = $m[7] ?? '';

        if (! checkdate((int) $month, (int) $day, (int) $year)
            || (int) $hour > 23 || (int) $minute > 59 || ($second !== '' && (int) $second > 59)) {
            return null;
        }

        $timezone = $offset === ''
            ? self::timezone()
            : new DateTimeZone(strtoupper($offset) === 'Z' ? 'UTC' : self::normaliseOffset($offset));

        $local = sprintf('%s-%s-%s %s:%s:%s', $year, $month, $day, $hour, $minute, $second === '' ? '00' : $second);

        $parsed = CarbonImmutable::createFromFormat('Y-m-d H:i:s', $local, $timezone);

        // Sub-second precision is dropped so stored values stay comparable as text.
        return $parsed === false ? null : $parsed->utc();
    }

    /**
     * Format a UTC instant for storage and for query bindings.
     */
    public static function toStorage(CarbonImmutable $value): string
    {
        return $value->utc()->format(self::STORAGE_FORMAT);
    }

    private static function normaliseOffset(string $offset): string
    {
        return strlen($offset) === 5 ? substr($offset, 0, 3).':'.substr($offset, 3) : $offset;
    }
}
