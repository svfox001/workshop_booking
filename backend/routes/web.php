<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => ['name' => config('app.name'), 'api' => url('/api')]);
