<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return $this->redirectToFrontend('invalid');
        }

        $user = User::query()->find($id);

        if (! $user || ! hash_equals(sha1((string) $user->email), $hash)) {
            return $this->redirectToFrontend('invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return $this->redirectToFrontend('already-verified', $user->email);
        }

        $user->markEmailAsVerified();

        return $this->redirectToFrontend('verified', $user->email);
    }

    private function redirectToFrontend(string $status, ?string $email = null): RedirectResponse
    {
        $frontendUrl = rtrim((string) config('carevance.frontend_url', config('app.url')), '/');
        $query = [
            'status' => $status,
        ];

        if ($email) {
            $query['email'] = $email;
        }

        return redirect()->away($frontendUrl.'/verify-email?'.http_build_query($query));
    }
}
