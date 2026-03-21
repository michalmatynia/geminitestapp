'use client';

export type KangurStorageChange = {
  key: string | null;
  value: string | null;
};

export type KangurClientStorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  subscribe: (listener: (change: KangurStorageChange) => void) => () => void;
};

export const createMemoryKangurClientStorage = (): KangurClientStorageAdapter => {
  const snapshot = new Map<string, string>();
  const listeners = new Set<(change: KangurStorageChange) => void>();

  const notifyListeners = (change: KangurStorageChange): void => {
    listeners.forEach((listener) => listener(change));
  };

  return {
    getItem: (key) => snapshot.get(key) ?? null,
    setItem: (key, value) => {
      snapshot.set(key, value);
      notifyListeners({ key, value });
    },
    removeItem: (key) => {
      if (!snapshot.has(key)) {
        return;
      }

      snapshot.delete(key);
      notifyListeners({ key, value: null });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const canUseLocalStorage = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const createBrowserKangurClientStorage = (): KangurClientStorageAdapter => {
  if (!canUseLocalStorage()) {
    return createMemoryKangurClientStorage();
  }

  const listeners = new Set<(change: KangurStorageChange) => void>();
  let isWindowStorageListenerAttached = false;

  const notifyListeners = (change: KangurStorageChange): void => {
    listeners.forEach((listener) => listener(change));
  };

  const handleWindowStorageChange = (event: StorageEvent): void => {
    notifyListeners({
      key: event.key,
      value: event.newValue,
    });
  };

  const ensureWindowStorageListener = (): void => {
    if (isWindowStorageListenerAttached || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', handleWindowStorageChange);
    isWindowStorageListenerAttached = true;
  };

  const removeWindowStorageListener = (): void => {
    if (!isWindowStorageListenerAttached || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('storage', handleWindowStorageChange);
    isWindowStorageListenerAttached = false;
  };

  return {
    getItem: (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        return;
      }

      notifyListeners({ key, value });
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        return;
      }

      notifyListeners({ key, value: null });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      ensureWindowStorageListener();

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          removeWindowStorageListener();
        }
      };
    },
  };
};

let kangurClientStorageAdapter: KangurClientStorageAdapter | null = null;

export const getKangurClientStorage = (): KangurClientStorageAdapter => {
  if (!kangurClientStorageAdapter) {
    kangurClientStorageAdapter = createBrowserKangurClientStorage();
  }

  return kangurClientStorageAdapter;
};

export const setKangurClientStorageAdapter = (
  adapter: KangurClientStorageAdapter,
): void => {
  kangurClientStorageAdapter = adapter;
};

export const resetKangurClientStorageAdapter = (): void => {
  kangurClientStorageAdapter = null;
};
