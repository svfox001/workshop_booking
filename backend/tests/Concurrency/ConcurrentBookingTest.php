<?php

use Symfony\Component\Process\Process;

/*
 * Separate PHP processes race to book the same bay and time against a
 * file-based SQLite database. Each process has its own connection, so this
 * exercises real concurrent writers rather than one connection in a
 * transaction-wrapped test.
 */

const CONCURRENT_WORKERS = 8;

beforeEach(function () {
    $this->workDir = storage_path('framework/testing/concurrency-'.bin2hex(random_bytes(4)));
    mkdir($this->workDir, 0777, true);

    $this->databasePath = $this->workDir.DIRECTORY_SEPARATOR.'database.sqlite';
    touch($this->databasePath);

    $this->processEnv = [
        'APP_ENV' => 'testing',
        'DB_CONNECTION' => 'sqlite',
        'DB_DATABASE' => $this->databasePath,
        'DB_URL' => '',
        'DB_JOURNAL_MODE' => 'wal',
        'DB_BUSY_TIMEOUT' => '10000',
        'CACHE_STORE' => 'array',
        'SESSION_DRIVER' => 'array',
        'QUEUE_CONNECTION' => 'sync',
        'LOG_CHANNEL' => 'stderr',
        'WORKSHOP_TIMEZONE' => 'Australia/Sydney',
        'WORKSHOP_SERVICE_BAYS' => 'Bay 1,Bay 2,Bay 3,Bay 4',
    ];

    $migrate = new Process([PHP_BINARY, base_path('artisan'), 'migrate', '--force', '--no-interaction'], base_path(), $this->processEnv);
    $migrate->mustRun();
});

afterEach(function () {
    // WAL side files may linger briefly on Windows; ignore failures.
    foreach (glob($this->workDir.DIRECTORY_SEPARATOR.'*') ?: [] as $file) {
        @unlink($file);
    }
    @rmdir($this->workDir);
});

/**
 * Start the workers, wait until every one has booted and connected, then
 * release them at the same moment and collect their results.
 *
 * @param  list<array<string, mixed>>  $payloads
 * @return list<array{exit: int|null, status: int|null, body: mixed, stderr: string}>
 */
function raceWorkers(array $payloads, string $workDir, array $env): array
{
    $goFile = $workDir.DIRECTORY_SEPARATOR.'go';
    $processes = [];

    foreach ($payloads as $i => $payload) {
        $process = new Process([
            PHP_BINARY,
            base_path('tests/Concurrency/book-slot-worker.php'),
            $workDir.DIRECTORY_SEPARATOR."ready-{$i}",
            $goFile,
            json_encode($payload),
        ], base_path(), $env, null, 60);
        $process->start();
        $processes[$i] = $process;
    }

    $deadline = microtime(true) + 45;
    while (count(glob($workDir.DIRECTORY_SEPARATOR.'ready-*')) < count($payloads)) {
        foreach ($processes as $process) {
            if (! $process->isRunning() && ! $process->isSuccessful()) {
                throw new RuntimeException('Worker failed to start: '.$process->getErrorOutput().$process->getOutput());
            }
        }
        if (microtime(true) > $deadline) {
            throw new RuntimeException('Workers did not become ready in time.');
        }
        usleep(5_000);
    }

    touch($goFile);

    $results = [];
    foreach ($processes as $process) {
        $process->wait();
        $decoded = json_decode($process->getOutput(), true);
        $results[] = [
            'exit' => $process->getExitCode(),
            'status' => $decoded['status'] ?? null,
            'body' => $decoded['body'] ?? $process->getOutput(),
            'stderr' => $process->getErrorOutput(),
        ];
    }

    return $results;
}

function countBookings(string $databasePath): int
{
    $pdo = new PDO('sqlite:'.$databasePath);

    return (int) $pdo->query('select count(*) from bookings')->fetchColumn();
}

it('stores exactly one booking when many processes book the same slot at once', function () {
    $payloads = array_map(fn (int $i) => [
        'customer_name' => "Racer {$i}",
        'customer_email' => "racer{$i}@example.com",
        'rego' => "RACE{$i}",
        'service_bay' => 'Bay 1',
        // Same slot, written with different offsets, so normalisation is raced too.
        'starts_at' => $i % 2 === 0 ? '2026-11-10T09:00' : '2026-11-09T22:00:00Z',
        'ends_at' => $i % 2 === 0 ? '2026-11-10T11:00' : '2026-11-10T00:00:00Z',
    ], range(1, CONCURRENT_WORKERS));

    $results = raceWorkers($payloads, $this->workDir, $this->processEnv);
    $summary = array_map(fn ($r) => $r['status'] ?? ('exit '.$r['exit'].': '.trim($r['stderr'].' '.json_encode($r['body']))), $results);

    foreach ($results as $result) {
        expect($result['exit'])->toBe(0, 'A worker exited abnormally: '.json_encode($summary));
    }

    $statuses = array_column($results, 'status');
    sort($statuses);

    expect($statuses)->toBe(
        array_merge([201], array_fill(0, CONCURRENT_WORKERS - 1, 409)),
        'Expected one 201 and the rest 409, got: '.json_encode($summary),
    );

    foreach ($results as $result) {
        if ($result['status'] === 409) {
            expect($result['body']['errors'])->toHaveKey('starts_at');
        }
    }

    expect(countBookings($this->databasePath))->toBe(1);
});

it('lets concurrent bookings for different bays all succeed', function () {
    $payloads = array_map(fn (int $i) => [
        'customer_name' => "Racer {$i}",
        'customer_email' => "racer{$i}@example.com",
        'rego' => "BAY{$i}",
        'service_bay' => "Bay {$i}",
        'starts_at' => '2026-11-10T09:00',
        'ends_at' => '2026-11-10T11:00',
    ], range(1, 4));

    $results = raceWorkers($payloads, $this->workDir, $this->processEnv);

    expect(array_column($results, 'status'))->toBe([201, 201, 201, 201], json_encode($results))
        ->and(countBookings($this->databasePath))->toBe(4);
});
