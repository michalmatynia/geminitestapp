import {
  createMemoryKangurClientStorage,
  type KangurClientStorageAdapter,
  type KangurStorageChange,
} from '@kangur/platform';

let mobileDevelopmentMemoryStorage: KangurClientStorageAdapter | null = null;
let mobileDevelopmentBrowserStorage: KangurClientStorageAdapter | null = null;
let mobileDevelopmentNativeStorage: KangurClientStorageAdapter | null = null;

type KangurMobileDevelopmentStorageMode =
  | 'auto'
  | 'browser'
  | 'memory'
  | 'native';

type NativeDirectoryCreateOptions = {
  idempotent?: boolean;
  intermediates?: boolean;
  overwrite?: boolean;
};

type NativeFileCreateOptions = {
  intermediates?: boolean;
  overwrite?: boolean;
};

type NativeFileLike = {
  readonly exists: boolean;
  create: (options?: NativeFileCreateOptions) => void;
  delete: () => void;
  textSync: () => string;
  write: (content: string) => void;
};

type NativeDirectoryLike = {
  readonly exists: boolean;
  create: (options?: NativeDirectoryCreateOptions) => void;
};

export type KangurNativeFileSystemLike = {
  Paths: {
    document: string;
  };
  Directory: new (...uris: Array<string | NativeDirectoryLike | NativeFileLike>) => NativeDirectoryLike;
  File: new (...uris: Array<string | NativeDirectoryLike | NativeFileLike>) => NativeFileLike;
};

type CreateMobileDevelopmentKangurStorageOptions = {
  mode?: KangurMobileDevelopmentStorageMode;
  nativeFileSystem?: KangurNativeFileSystemLike;
  nativeStorageNamespace?: string;
};

const MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE = 'kangur-mobile';
const MOBILE_DEVELOPMENT_NATIVE_STORAGE_FILENAME =
  'development-storage.json';

const canUseBrowserLocalStorage = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
};

const getSharedMemoryStorage = (): KangurClientStorageAdapter => {
  if (!mobileDevelopmentMemoryStorage) {
    mobileDevelopmentMemoryStorage = createMemoryKangurClientStorage();
  }

  return mobileDevelopmentMemoryStorage;
};

const isReactNativeRuntime = (): boolean =>
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

const resolveStorageMode = (
  mode: KangurMobileDevelopmentStorageMode = 'auto',
): Exclude<KangurMobileDevelopmentStorageMode, 'auto'> => {
  if (mode !== 'auto') {
    return mode;
  }

  if (canUseBrowserLocalStorage()) {
    return 'browser';
  }

  if (isReactNativeRuntime()) {
    return 'native';
  }

  return 'memory';
};

const loadExpoFileSystem = (): KangurNativeFileSystemLike => {
  if (typeof require !== 'function') {
    throw new Error(
      'Native Kangur storage requires expo-file-system support in the current runtime.',
    );
  }

  return require('expo-file-system') as KangurNativeFileSystemLike;
};

const readNativeStorageSnapshot = (
  storageFile: NativeFileLike,
): Record<string, string> => {
  if (!storageFile.exists) {
    return {};
  }

  try {
    const rawSnapshot = storageFile.textSync().trim();
    if (!rawSnapshot) {
      return {};
    }

    const parsedSnapshot = JSON.parse(rawSnapshot) as unknown;
    if (
      !parsedSnapshot ||
      typeof parsedSnapshot !== 'object' ||
      Array.isArray(parsedSnapshot)
    ) {
      return {};
    }

    return Object.entries(parsedSnapshot).reduce<Record<string, string>>(
      (snapshot, [key, value]) => {
        if (typeof value === 'string') {
          snapshot[key] = value;
        }
        return snapshot;
      },
      {},
    );
  } catch {
    return {};
  }
};

const createNativeFileBackedMobileStorage = (
  fileSystem: KangurNativeFileSystemLike,
  namespace: string,
): KangurClientStorageAdapter => {
  const listeners = new Set<(change: KangurStorageChange) => void>();
  const storageDirectory = new fileSystem.Directory(
    fileSystem.Paths.document,
    namespace,
  );
  const storageFile = new fileSystem.File(
    storageDirectory,
    MOBILE_DEVELOPMENT_NATIVE_STORAGE_FILENAME,
  );

  const notifyListeners = (change: KangurStorageChange): void => {
    listeners.forEach((listener) => listener(change));
  };

  let cachedSnapshot: Record<string, string> | null = null;

  const ensureStorageFile = (): void => {
    if (!storageDirectory.exists) {
      storageDirectory.create({
        idempotent: true,
        intermediates: true,
      });
    }

    if (!storageFile.exists) {
      storageFile.create({
        intermediates: true,
      });
      storageFile.write('{}');
    }
  };

  const loadSnapshot = (): Record<string, string> => {
    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    cachedSnapshot = readNativeStorageSnapshot(storageFile);
    return cachedSnapshot;
  };

  const writeSnapshot = (snapshot: Record<string, string>): void => {
    ensureStorageFile();
    storageFile.write(JSON.stringify(snapshot));
    cachedSnapshot = snapshot;
  };

  return {
    getItem: (key) => {
      const snapshot = loadSnapshot();
      return snapshot[key] ?? null;
    },
    setItem: (key, value) => {
      const snapshot = {
        ...loadSnapshot(),
      };
      snapshot[key] = value;
      writeSnapshot(snapshot);
      notifyListeners({ key, value });
    },
    removeItem: (key) => {
      const snapshot = {
        ...loadSnapshot(),
      };
      if (!(key in snapshot)) {
        return;
      }

      delete snapshot[key];
      if (Object.keys(snapshot).length === 0) {
        if (storageFile.exists) {
          storageFile.delete();
        }
        cachedSnapshot = {};
      } else {
        writeSnapshot(snapshot);
      }
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

const createBrowserBackedMobileStorage = (): KangurClientStorageAdapter => {
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

export const createMobileDevelopmentKangurStorage = (
  options: CreateMobileDevelopmentKangurStorageOptions = {},
): KangurClientStorageAdapter => {
  const storageMode = resolveStorageMode(options.mode);

  if (storageMode === 'memory') {
    return getSharedMemoryStorage();
  }

  if (storageMode === 'browser') {
    if (!mobileDevelopmentBrowserStorage) {
      mobileDevelopmentBrowserStorage = createBrowserBackedMobileStorage();
    }

    return mobileDevelopmentBrowserStorage;
  }

  if (!mobileDevelopmentNativeStorage) {
    mobileDevelopmentNativeStorage = createNativeFileBackedMobileStorage(
      options.nativeFileSystem ?? loadExpoFileSystem(),
      options.nativeStorageNamespace ??
        MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE,
    );
  }

  return mobileDevelopmentNativeStorage;
};

export const resetMobileDevelopmentKangurStorage = (): void => {
  mobileDevelopmentMemoryStorage = null;
  mobileDevelopmentBrowserStorage = null;
  mobileDevelopmentNativeStorage = null;
};

export type KangurMobileDevelopmentStorage = ReturnType<
  typeof createMobileDevelopmentKangurStorage
>;
