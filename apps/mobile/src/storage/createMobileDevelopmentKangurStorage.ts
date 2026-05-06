import {
  createMemoryKangurClientStorage,
  type KangurClientStorageAdapter,
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

const createStorage = (mode: string, options: CreateMobileDevelopmentKangurStorageOptions): KangurClientStorageAdapter => {
    if (mode === 'memory') return getSharedMemoryStorage();
    if (mode === 'browser') {
        mobileDevelopmentBrowserStorage ??= createBrowserBackedMobileStorage();
        return mobileDevelopmentBrowserStorage;
    }
    mobileDevelopmentNativeStorage ??= createNativeFileBackedMobileStorage(
        (options.nativeFileSystem ?? loadExpoFileSystem()) as any,
        options.nativeStorageNamespace ?? MOBILE_DEVELOPMENT_NATIVE_STORAGE_NAMESPACE,
    );
    return mobileDevelopmentNativeStorage;
};

export const createMobileDevelopmentKangurStorage = (
  options: CreateMobileDevelopmentKangurStorageOptions = {},
): KangurClientStorageAdapter => {
  return createStorage(options.mode ?? 'auto', options);
};
