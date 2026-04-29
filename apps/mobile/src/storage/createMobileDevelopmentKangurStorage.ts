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

type CreateMobileDevelopmentKangurStorageOptions = {
  mode?: KangurMobileDevelopmentStorageMode;
  nativeFileSystem?: any;
  nativeStorageNamespace?: string;
};

const MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE = 'kangur-mobile-dev-native';

const getSharedMemoryStorage = (): KangurClientStorageAdapter => {
  mobileDevelopmentMemoryStorage ??= createMemoryKangurClientStorage();
  return mobileDevelopmentMemoryStorage;
};

// ... (remaining implementation)

export const createMobileDevelopmentKangurStorage = (
  options: CreateMobileDevelopmentKangurStorageOptions = {},
): KangurClientStorageAdapter => {
  const storageMode = options.mode ?? 'auto';

  if (storageMode === 'memory') {
    return getSharedMemoryStorage();
  }

  if (storageMode === 'browser') {
    mobileDevelopmentBrowserStorage ??= createBrowserBackedMobileStorage();
    return mobileDevelopmentBrowserStorage;
  }

  mobileDevelopmentNativeStorage ??= createNativeFileBackedMobileStorage(
    options.nativeFileSystem ?? loadExpoFileSystem(),
    options.nativeStorageNamespace ??
      MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE,
  );

  return mobileDevelopmentNativeStorage;
};
