<?php

namespace App\Services\Invitations;

class InvitationUrlService
{
    public function acceptUrl(string $token): string
    {
        $frontendUrl = rtrim((string) config('carevance.frontend_url', config('app.url')), '/');

        return $frontendUrl.'/accept-invite/'.$token;
    }
}
