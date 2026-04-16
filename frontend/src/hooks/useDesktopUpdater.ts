import { useEffect, useState } from 'react';

type DesktopUpdaterActions = {
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
};

const DEFAULT_STATE: DesktopUpdateState = {
  enabled: false,
  status: 'disabled',
  currentVersion: '',
  message: 'Automatic updates are unavailable.',
  releaseNotes: '',
  releaseDate: null,
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: 0,
};

export const useDesktopUpdater = (): {
  state: DesktopUpdateState;
  isActionPending: boolean;
  actionError: string;
} & DesktopUpdaterActions => {
  const [state, setState] = useState<DesktopUpdateState>(DEFAULT_STATE);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const desktopApi = window.desktopTracker;

    if (!desktopApi?.getUpdateState) {
      setState(DEFAULT_STATE);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      try {
        const nextState = await desktopApi.getUpdateState?.();
        if (active && nextState) {
          setState(nextState);
        }
      } catch (error) {
        if (active) {
          setActionError(error instanceof Error ? error.message : 'Unable to load update status.');
        }
      }
    };

    void bootstrap();

    const unsubscribe = desktopApi.onUpdateState?.((nextState) => {
      if (!active) {
        return;
      }

      setState(nextState);
      if (nextState.status !== 'error') {
        setActionError('');
      }
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      } else {
        desktopApi.clearUpdateStateListeners?.();
      }
    };
  }, []);

  const runAction = async (action: (() => Promise<unknown>) | undefined) => {
    if (!action) {
      setActionError('Automatic updates are not available in this desktop build.');
      return;
    }

    setIsActionPending(true);
    setActionError('');

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Desktop update action failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  return {
    state,
    isActionPending,
    actionError,
    checkForUpdates: async () => {
      await runAction(window.desktopTracker?.checkForUpdates);
    },
    downloadUpdate: async () => {
      await runAction(window.desktopTracker?.downloadUpdate);
    },
    installUpdate: async () => {
      await runAction(window.desktopTracker?.installUpdate);
    },
  };
};
