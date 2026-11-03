<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ServiceBayController;
use Illuminate\Support\Facades\Route;

Route::get('service-bays', ServiceBayController::class);

// PUT only: an update replaces the whole booking, so PATCH is not offered.
Route::apiResource('bookings', BookingController::class)->except('update')->whereNumber('booking');
Route::put('bookings/{booking}', [BookingController::class, 'update'])->whereNumber('booking')->name('bookings.update');
