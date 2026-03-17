<?php

use App\Http\Controllers\Api\InviteController;
use Illuminate\Support\Facades\Route;

Route::post('/invites/send', [InviteController::class, 'sendInvite'])
    ->middleware('throttle:invitations.create');
