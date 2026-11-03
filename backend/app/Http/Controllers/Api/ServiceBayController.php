<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ServiceBayController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => config('workshop.service_bays')]);
    }
}
