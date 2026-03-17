<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class InviteUserMail extends Mailable
{
    public function __construct(
        public readonly string $inviteLink,
        public readonly string $companyName,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You are invited to join CareVance HRMS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invite-user',
            with: [
                'inviteLink' => $this->inviteLink,
                'companyName' => $this->companyName,
            ],
        );
    }
}
