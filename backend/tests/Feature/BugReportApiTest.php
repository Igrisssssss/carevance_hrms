<?php

namespace Tests\Feature;

use App\Mail\BugReportSubmittedMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BugReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_bug_report_is_stored_and_emailed(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/support/bug-reports', [
            'name' => 'Jordan',
            'email' => 'jordan@example.com',
            'issue_category' => 'bug',
            'summary' => 'Login button spins forever',
            'description' => 'The login button keeps spinning after I submit the form.',
            'current_path' => '/login',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Bug report submitted successfully.');

        $this->assertDatabaseHas('bug_reports', [
            'email' => 'jordan@example.com',
            'issue_category' => 'bug',
            'summary' => 'Login button spins forever',
            'current_path' => '/login',
        ]);

        Mail::assertQueued(BugReportSubmittedMail::class);
    }

    public function test_bug_report_endpoint_is_rate_limited(): void
    {
        $payload = [
            'email' => 'jordan@example.com',
            'issue_category' => 'bug',
            'summary' => 'Issue summary',
            'description' => 'Detailed description for the issue.',
        ];

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/support/bug-reports', $payload)->assertCreated();
        }

        $this->postJson('/api/support/bug-reports', $payload)->assertStatus(429);
    }
}
