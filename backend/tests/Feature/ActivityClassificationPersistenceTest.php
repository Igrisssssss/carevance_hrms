<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityClassificationPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_save_populates_classification_fields_for_known_software(): void
    {
        $organization = Organization::create(['name' => 'CareVance Labs', 'slug' => 'carevance-labs']);
        $user = User::create([
            'name' => 'Example User',
            'email' => 'example.user@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $activity = Activity::create([
            'user_id' => $user->id,
            'type' => 'app',
            'name' => 'Visual Studio Code - app.php - demo_laravel_2 - Visual Studio Code',
            'duration' => 120,
            'recorded_at' => now(),
        ]);

        $this->assertSame('software', $activity->tool_type);
        $this->assertSame('vscode', $activity->software_name);
        $this->assertSame('vscode', $activity->normalized_label);
        $this->assertSame('productive', $activity->classification);
        $this->assertNotNull($activity->classified_at);
    }

    public function test_code_filenames_are_not_mistaken_for_domains_during_activity_classification(): void
    {
        $organization = Organization::create(['name' => 'CareVance Labs', 'slug' => 'carevance-labs']);
        $user = User::create([
            'name' => 'Editor User',
            'email' => 'editor.user@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $activity = Activity::create([
            'user_id' => $user->id,
            'type' => 'app',
            'name' => 'Visual Studio Code - auth.php - demo_laravel_2 - Visual Studio Code',
            'duration' => 45,
            'recorded_at' => now(),
        ]);

        $this->assertSame('software', $activity->tool_type);
        $this->assertNull($activity->normalized_domain);
        $this->assertSame('productive', $activity->classification);
    }
}
