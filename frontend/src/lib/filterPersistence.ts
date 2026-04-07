const readStorageJson = <T,>(storage: Storage, key: string): Partial<T> | null => {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
};

export const coercePositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const coercePositiveNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => coercePositiveNumber(item))
    .filter((item): item is number => item !== null);
};

export const readSessionStorageJson = <T,>(key: string): Partial<T> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const localValue = readStorageJson<T>(window.localStorage, key);
  if (localValue) {
    return localValue;
  }

  const sessionValue = readStorageJson<T>(window.sessionStorage, key);
  if (!sessionValue) {
    return null;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(sessionValue));
  } catch {
    // Ignore localStorage write failures and still return the session value.
  }

  return sessionValue;
};

export const writeSessionStorageJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  const serialized = JSON.stringify(value);

  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // Ignore localStorage write failures and keep the session copy updated.
  }

  window.sessionStorage.setItem(key, serialized);
};
