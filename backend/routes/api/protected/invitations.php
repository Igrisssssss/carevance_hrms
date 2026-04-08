<?php

use App\Http\Controllers\Api\InvitationController;
use Illuminate\Support\Facades\Route;

Route::get('/invitations', [InvitationController::class, 'index']);
Route::post('/invitations', [InvitationController::class, 'store'])->middleware('throttle:invitations.create');
Route::post('/invitations/import', [InvitationController::class, 'import'])->middleware('throttle:invitations.create');
