import {
  createMemoryKangurClientStorage,
  type KangurClientStorageAdapter,
} from '@kangur/platform';

export type KangurNativeFileSystemLike = {
  Paths: {
    document: string;
  };
  Directory: new (...segments: Array<string | { uri?: string }>) => {
    exists: boolean;
    create: () => void;
  };
  File: new (...segments: Array<string | { uri?: string }>) => {
    exists: boolean;
    create: () => void;
    delete: () => void;
    textSync: () => string;
    write: (content: string) => void;
  };
};

let mobileDevelopmentMemoryStorage: KangurClientStorageAdapter | null = null;
let mobileDevelopmentBrowserStorage: KangurClientStorageAdapter | null = null;
let mobileDevelopmentNativeStorage: KangurClientStorageAdapter | null = null;

type KangurMobileDevelopmentStorageMode =
  | 'auto'
  | 'browser'
  | 'memory'
  | 'native';

type CreateMobileDevelopmentKangurStorageOptions = {
  mode?: KangurMobileDevelopmentStorageMode;
  nativeFileSystem?: unknown;
  nativeStorageNamespace?: string;
};

const MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE = 'kangur-mobile-dev-native';

const getSharedMemoryStorage = (): KangurClientStorageAdapter => {
  mobileDevelopmentMemoryStorage ??= createMemoryKangurClientStorage();
  return mobileDevelopmentMemoryStorage;
};

const isBrowserStorageAvailable = (): boolean =>
  typeof globalThis !== 'undefined' &&
  'localStorage' in globalThis;

const createBrowserBackedMobileStorage = (): KangurClientStorageAdapter => {
  const listeners = new Set<(change: { key: string | null; value: string | null }) => void>();
  const emitChange = (change: { key: string | null; value: string | null }): void => {
    listeners.forEach((listener) => listener(change));
  };

  return {
    getItem: (key) => globalThis.localStorage.getItem(key),
    removeItem: (key) => {
      globalThis.localStorage.removeItem(key);
      emitChange({ key, value: null });
    },
    setItem: (key, value) => {
      globalThis.localStorage.setItem(key, value);
      emitChange({ key, value });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const serializeSnapshot = (snapshot: Record<string, string>): string =>
  JSON.stringify(snapshot);

const deserializeSnapshot = (payload: string | null): Record<string, string> => {
  if (typeof payload !== 'string' || payload.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(payload);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => typeof value === 'string',
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
};

const createNativeFileBackedMobileStorage = (
  nativeFileSystem: KangurNativeFileSystemLike,
  namespace: string,
): KangurClientStorageAdapter => {
  const listeners = new Set<(change: { key: string | null; value: string | null }) => void>();
  const emitChange = (change: { key: string | null; value: string | null }): void => {
    listeners.forEach((listener) => listener(change));
  };
  const documentDirectory = new nativeFileSystem.Directory(nativeFileSystem.Paths.document);
  const storageFile = new nativeFileSystem.File(
    nativeFileSystem.Paths.document,
    namespace,
  );
  let snapshot: Record<string, string> | null = null;

  const loadSnapshot = (): Record<string, string> => {
    if (snapshot !== null) {
      return snapshot;
    }

    if (!documentDirectory.exists) {
      documentDirectory.create();
    }

    if (!storageFile.exists) {
      storageFile.create();
      snapshot = {};
      return snapshot;
    }

    const raw = storageFile.textSync();
    snapshot = deserializeSnapshot(raw);
    return snapshot;
  };

  const persistSnapshot = (): void => {
    if (!documentDirectory.exists) {
      documentDirectory.create();
    }
    if (!storageFile.exists) {
      storageFile.create();
    }
    storageFile.write(serializeSnapshot(snapshot ?? {}));
  };

  const resolveItem = (key: string): string | null => {
    const currentSnapshot = loadSnapshot();
    if (!(key in currentSnapshot)) {
      return null;
    }
    return currentSnapshot[key] ?? null;
  };

  const removeItem = (key: string): void => {
    const currentSnapshot = loadSnapshot();
    delete currentSnapshot[key];
    persistSnapshot();
    emitChange({ key, value: null });
  };

  const setItem = (key: string, value: string): void => {
    const currentSnapshot = loadSnapshot();
    currentSnapshot[key] = value;
    persistSnapshot();
    emitChange({ key, value });
  };

  return {
    getItem: resolveItem,
    removeItem,
    setItem,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const loadExpoFileSystem = (): KangurNativeFileSystemLike | null => {
  try {
     
    const expoFileSystem = require('expo-file-system');
    const normalizedModule =
      expoFileSystem?.default ?? expoFileSystem?.FileSystem ?? expoFileSystem;
    if (
      normalizedModule &&
      typeof normalizedModule.Paths === 'object' &&
      typeof normalizedModule.Paths.document === 'string' &&
      typeof normalizedModule.Directory === 'function' &&
      typeof normalizedModule.File === 'function'
    ) {
      return normalizedModule as KangurNativeFileSystemLike;
    }
  } catch {
    // no-op
  }

  return null;
};

const createStorage = (
  mode: KangurMobileDevelopmentStorageMode,
  options: CreateMobileDevelopmentKangurStorageOptions,
): KangurClientStorageAdapter => {
  if (mode === 'memory') {
    return getSharedMemoryStorage();
  }

  if (mode === 'browser') {
    if (!isBrowserStorageAvailable()) {
      return getSharedMemoryStorage();
    }
    mobileDevelopmentBrowserStorage ??= createBrowserBackedMobileStorage();
    return mobileDevelopmentBrowserStorage;
  }

  if (mode === 'native') {
    const nativeFileSystem =
      (options.nativeFileSystem as KangurNativeFileSystemLike | undefined) ??
      loadExpoFileSystem();
    if (nativeFileSystem) {
      mobileDevelopmentNativeStorage ??=
        createNativeFileBackedMobileStorage(
          nativeFileSystem,
          options.nativeStorageNamespace ??
            MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE,
        );
      return mobileDevelopmentNativeStorage;
    }

    return getSharedMemoryStorage();
  }

  const nativeFileSystem =
    (options.nativeFileSystem as KangurNativeFileSystemLike | undefined) ??
    loadExpoFileSystem();
  if (isBrowserStorageAvailable()) {
    mobileDevelopmentBrowserStorage ??= createBrowserBackedMobileStorage();
    return mobileDevelopmentBrowserStorage;
  }
  if (nativeFileSystem) {
    mobileDevelopmentNativeStorage ??=
      createNativeFileBackedMobileStorage(
        nativeFileSystem,
        options.nativeStorageNamespace ??
          MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE,
      );
    return mobileDevelopmentNativeStorage;
  }

  return getSharedMemoryStorage();
};

const createStorageForMode = (
  mode: string,
  options: CreateMobileDevelopmentKangurStorageOptions,
): KangurClientStorageAdapter =>
  createStorage(mode as KangurMobileDevelopmentStorageMode, options);

export const resetMobileDevelopmentKangurStorage = (): void => {
  mobileDevelopmentMemoryStorage = null;
  mobileDevelopmentBrowserStorage = null;
  mobileDevelopmentNativeStorage = null;
};

export const createMobileDevelopmentKangurStorage = (
  options: CreateMobileDevelopmentKangurStorageOptions = {},
): KangurClientStorageAdapter => {
  return createStorageForMode(options.mode ?? 'auto', options);
};
