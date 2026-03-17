<?php

namespace App\Mail;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CareVanceInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invitation $invitation,
        public readonly string $acceptUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Accept your CareVance invitation',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invitations.carevance',
            with: [
                'organizationName' => $this->invitation->organization?->name ?? 'CareVance workspace',
                'email' => $this->invitation->email,
                'role' => ucfirst($this->invitation->role),
                'acceptUrl' => $this->acceptUrl,
                'expiresAt' => $this->invitation->expires_at,
                'salesEmail' => config('carevance.sales_email'),
            ],
        );
    }
}
