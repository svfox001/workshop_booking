<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Exceptions\BookingConflictException;
use App\Exceptions\BookingLockTimeoutException;
use App\Models\Booking;
use App\Support\WorkshopTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * All booking writes go through this class so the service bay rule
 * ("two active bookings cannot overlap in the same bay") is enforced
 * under a per-bay lock.
 *
 * Each write runs in a transaction whose first statement writes the bay's
 * row in service_bay_locks. On SQLite that write takes the database's single
 * write lock, so all booking writes are serialised. On MySQL and PostgreSQL
 * it takes an exclusive row lock, so writes are serialised per bay. The
 * conflict check and the save then run while that lock is held.
 */
class BookingService
{
    /** Attempts to re-lock when an update's bay changed between reading and locking. */
    private const MAX_LOCK_ATTEMPTS = 3;

    /**
     * @param  array<string, mixed>  $attributes  Validated attributes with UTC date-times.
     */
    public function create(array $attributes): Booking
    {
        return $this->withBayLocks([$attributes['service_bay']], function () use ($attributes) {
            $booking = new Booking($attributes);

            $this->ensureNoConflict($booking);
            $booking->save();

            return $booking;
        });
    }

    /**
     * Replace a booking. When it moves between bays, both bays are locked
     * in sorted order so two opposite moves cannot deadlock.
     *
     * @param  array<string, mixed>  $attributes  Validated attributes with UTC date-times.
     */
    public function update(Booking $booking, array $attributes): Booking
    {
        $knownBay = $booking->service_bay;

        for ($attempt = 1; $attempt <= self::MAX_LOCK_ATTEMPTS; $attempt++) {
            $bays = [$knownBay, $attributes['service_bay']];

            $result = $this->withBayLocks($bays, function () use ($booking, $attributes, $bays) {
                // Re-read under the lock: another request may have changed or deleted it.
                $current = Booking::query()->findOrFail($booking->getKey());

                if (! in_array($current->service_bay, $bays, true)) {
                    return $current->service_bay;
                }

                $current->fill($attributes);
                $this->ensureNoConflict($current);
                $current->save();

                return $current;
            });

            if ($result instanceof Booking) {
                return $result;
            }

            $knownBay = $result;
        }

        throw new RuntimeException('The booking kept moving between service bays while it was being updated.');
    }

    public function delete(Booking $booking): void
    {
        // Removing a booking can only free a slot, so no bay lock is needed.
        $booking->delete();
    }

    /**
     * Run the callback in a transaction that first locks each bay's row.
     *
     * @template T
     *
     * @param  list<string>  $bays
     * @param  callable(): T  $callback
     * @return T
     */
    private function withBayLocks(array $bays, callable $callback): mixed
    {
        $bays = array_values(array_unique($bays));
        sort($bays, SORT_STRING);

        $connection = DB::connection();

        try {
            return $connection->transaction(function (Connection $connection) use ($bays, $callback) {
                foreach ($bays as $bay) {
                    $this->lockBay($connection, $bay);
                }

                return $callback();
            });
        } catch (QueryException $e) {
            if ($this->isLockTimeout($connection, $e)) {
                throw new BookingLockTimeoutException($e);
            }

            throw $e;
        }
    }

    /**
     * Write the bay's lock row, creating it if missing. This must be the first
     * statement in the transaction: a SQLite deferred transaction that reads
     * first cannot wait for the write lock later (it fails with SQLITE_BUSY),
     * and on MySQL/PostgreSQL the upsert holds an exclusive row lock until commit.
     */
    private function lockBay(Connection $connection, string $bay): void
    {
        $connection->table('service_bay_locks')->upsert(
            [['service_bay' => $bay, 'locked_at' => WorkshopTime::toStorage(CarbonImmutable::now())]],
            ['service_bay'],
            ['locked_at'],
        );
    }

    private function ensureNoConflict(Booking $booking): void
    {
        if (! $booking->status->isActive()) {
            return;
        }

        $conflict = Booking::query()
            ->where('service_bay', $booking->service_bay)
            ->where('starts_at', '<', WorkshopTime::toStorage($booking->ends_at))
            ->where('ends_at', '>', WorkshopTime::toStorage($booking->starts_at))
            ->whereIn('status', BookingStatus::activeValues())
            ->when($booking->exists, fn ($query) => $query->whereKeyNot($booking->getKey()))
            ->exists();

        if ($conflict) {
            throw new BookingConflictException($booking->service_bay);
        }
    }

    private function isLockTimeout(Connection $connection, QueryException $e): bool
    {
        $driverCode = (int) ($e->errorInfo[1] ?? 0);

        return match ($connection->getDriverName()) {
            // SQLITE_BUSY (5) / SQLITE_LOCKED (6), including extended codes such as SQLITE_BUSY_SNAPSHOT.
            'sqlite' => in_array($driverCode & 0xFF, [5, 6], true) || str_contains($e->getMessage(), 'database is locked'),
            // ER_LOCK_WAIT_TIMEOUT
            'mysql', 'mariadb' => $driverCode === 1205,
            // lock_not_available
            'pgsql' => ($e->errorInfo[0] ?? null) === '55P03',
            default => false,
        };
    }
}
