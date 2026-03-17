<?php

use App\Http\Controllers\Api\BillingController;
use Illuminate\Support\Facades\Route;

Route::get('/billing/current', [BillingController::class, 'current']);
