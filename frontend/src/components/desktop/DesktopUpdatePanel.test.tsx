import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesktopUpdatePanel from '@/components/desktop/DesktopUpdatePanel';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DesktopUpdatePanel', () => {
  beforeEach(() => {
    delete window.desktopTracker;
  });

  it('shows available update details and downloads from the panel', async () => {
    const downloadUpdate = vi.fn().mockResolvedValue({
      enabled: true,
      status: 'downloading',
      currentVersion: '1.0.1',
      message: 'Downloading update 25%',
      releaseNotes: 'Fix timer shutdown\nAdd update center',
      releaseDate: '2026-03-19T00:00:00.000Z',
      availableVersion: '1.0.2',
      downloadedVersion: null,
      progressPercent: 25,
    });

    window.desktopTracker = {
      captureScreenshot: vi.fn(),
      getSystemIdleSeconds: vi.fn(),
      getActiveWindowContext: vi.fn(),
      revealWindow: vi.fn(),
      getUpdateState: vi.fn().mockResolvedValue({
        enabled: true,
        status: 'available',
        currentVersion: '1.0.1',
        message: 'Version 1.0.2 is available.',
        releaseNotes: 'Fix timer shutdown\nAdd update center',
        releaseDate: '2026-03-19T00:00:00.000Z',
        availableVersion: '1.0.2',
        downloadedVersion: null,
        progressPercent: 0,
      }),
      checkForUpdates: vi.fn(),
      downloadUpdate,
      installUpdate: vi.fn(),
      onUpdateState: vi.fn(),
      clearUpdateStateListeners: vi.fn(),
    };

    renderWithProviders(<DesktopUpdatePanel />);

    expect(await screen.findByText(/new version available: v1.0.2/i)).toBeInTheDocument();
    expect(screen.getByText(/fix timer shutdown/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /download update/i }));

    await waitFor(() => {
      expect(downloadUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
