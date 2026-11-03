<?php

it('returns a JSON 404 for a missing booking', function (string $method) {
    $response = $this->json($method, '/api/bookings/999999', $method === 'PUT' ? bookingPayload(['status' => 'pending']) : []);

    $response->assertNotFound()
        ->assertExactJson(['message' => 'Booking not found.']);
})->with(['GET', 'PUT', 'DELETE']);

it('returns a JSON 404 even when the client does not ask for JSON', function (string $method) {
    $this->call($method, '/api/bookings/999999', [], [], [], ['HTTP_ACCEPT' => 'text/html'])
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertExactJson(['message' => 'Booking not found.']);
})->with(['GET', 'PUT', 'DELETE']);

it('returns a JSON 404 for an unknown API route or non-numeric id', function (string $uri) {
    $this->get($uri, ['Accept' => 'text/html'])
        ->assertNotFound()
        ->assertExactJson(['message' => 'Not found.']);
})->with(['/api/nope', '/api/bookings/abc']);

it('returns a JSON 405 for an unsupported method', function () {
    $this->patch('/api/bookings/1', [], ['Accept' => 'text/html'])
        ->assertStatus(405)
        ->assertHeader('Content-Type', 'application/json');
});
