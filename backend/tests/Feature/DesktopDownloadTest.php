<?php

namespace Tests\Feature;

use Tests\TestCase;

class DesktopDownloadTest extends TestCase
{
    public function test_windows_download_redirects_to_configured_installer_url(): void
    {
        config()->set('services.desktop.windows_download_url', 'https://example.com/CareVance.Tracker-Setup-1.0.2-x64.exe');

        $this->get('/api/downloads/desktop/windows')
            ->assertRedirect('https://example.com/CareVance.Tracker-Setup-1.0.2-x64.exe');
    }

    public function test_windows_download_returns_not_found_when_not_configured(): void
    {
        config()->set('services.desktop.windows_download_url', '');

        $this->getJson('/api/downloads/desktop/windows')
            ->assertNotFound()
            ->assertJson([
                'message' => 'Desktop download is not configured.',
            ]);
    }
}
