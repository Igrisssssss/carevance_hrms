export const readSessionStorageJson = <T,>(key: string): Partial<T> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
};

export const writeSessionStorageJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
};
