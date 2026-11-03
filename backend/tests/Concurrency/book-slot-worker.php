<?php

/**
 * Worker for ConcurrentBookingTest. Runs in its own PHP process with its own
 * database connection, waits for the shared start signal, then sends one
 * POST /api/bookings through the full HTTP kernel and prints the outcome.
 *
 * Usage: php book-slot-worker.php <ready-file> <go-file> <payload-json>
 * The database is chosen by the DB_* environment variables the parent sets.
 */

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

[, $readyFile, $goFile, $payload] = $argv;

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

// Open the connection before the barrier so every worker starts its request together.
$app->make('db')->connection()->getPdo();

touch($readyFile);

$deadline = microtime(true) + 30;
while (! file_exists($goFile)) {
    if (microtime(true) > $deadline) {
        fwrite(STDERR, "Timed out waiting for the start signal.\n");
        exit(2);
    }
    usleep(500);
}

$request = Request::create('/api/bookings', 'POST', server: [
    'CONTENT_TYPE' => 'application/json',
    'HTTP_ACCEPT' => 'application/json',
], content: $payload);

$response = $kernel->handle($request);

echo json_encode([
    'status' => $response->getStatusCode(),
    'body' => json_decode((string) $response->getContent(), true),
]);

$kernel->terminate($request, $response);
