const AUTH_STORAGE_KEYS = ['token', 'user', 'organization'] as const;

export type AuthStorageKey = (typeof AUTH_STORAGE_KEYS)[number];

const hasWindow = () => typeof window !== 'undefined';

const getPreferredAuthStorage = (): Storage | null => {
  if (!hasWindow()) {
    return null;
  }

  return window.desktopTracker ? window.localStorage : window.sessionStorage;
};

const getSecondaryAuthStorage = (): Storage | null => {
  if (!hasWindow()) {
    return null;
  }

  return window.desktopTracker ? window.sessionStorage : window.localStorage;
};

export const getStoredAuthValue = (key: AuthStorageKey) => {
  const preferredStorage = getPreferredAuthStorage();
  const preferredValue = preferredStorage?.getItem(key);

  if (preferredValue !== null && preferredValue !== undefined) {
    return preferredValue;
  }

  return getSecondaryAuthStorage()?.getItem(key) ?? null;
};

export const setStoredAuthValue = (key: AuthStorageKey, value: string) => {
  getPreferredAuthStorage()?.setItem(key, value);
  getSecondaryAuthStorage()?.removeItem(key);
};

export const removeStoredAuthValue = (key: AuthStorageKey) => {
  getPreferredAuthStorage()?.removeItem(key);
  getSecondaryAuthStorage()?.removeItem(key);
};

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    removeStoredAuthValue(key);
  });
};



export const migrateStoredAuth = () => {
  const preferredStorage = getPreferredAuthStorage();
  const secondaryStorage = getSecondaryAuthStorage();

  if (!preferredStorage || !secondaryStorage || preferredStorage === secondaryStorage) {
    return;
  }

  AUTH_STORAGE_KEYS.forEach((key) => {
    const preferredValue = preferredStorage.getItem(key);
    const secondaryValue = secondaryStorage.getItem(key);

    if ((preferredValue === null || preferredValue === undefined) && secondaryValue !== null) {
      preferredStorage.setItem(key, secondaryValue);
    }

    secondaryStorage.removeItem(key);
  });
};