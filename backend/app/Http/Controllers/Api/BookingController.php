<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexBookingsRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookings) {}

    public function index(IndexBookingsRequest $request): AnonymousResourceCollection
    {
        $bookings = Booking::query()
            ->when($request->status(), fn ($query, $status) => $query->where('status', $status->value))
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->paginate($request->perPage())
            ->withQueryString();

        return BookingResource::collection($bookings);
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookings->create($request->bookingAttributes());

        return (new BookingResource($booking))->response()->setStatusCode(201);
    }

    public function show(Booking $booking): BookingResource
    {
        return new BookingResource($booking);
    }

    public function update(UpdateBookingRequest $request, Booking $booking): BookingResource
    {
        return new BookingResource($this->bookings->update($booking, $request->bookingAttributes()));
    }

    public function destroy(Booking $booking): Response
    {
        $this->bookings->delete($booking);

        return response()->noContent();
    }
}
