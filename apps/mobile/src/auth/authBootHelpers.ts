import { KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY } from './mobileAuthStorageKeys';
import type { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

export const scheduleInitialAuthRefreshFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const frameId = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
    };
  }

  const timeoutId = setTimeout(callback, 16);
  return () => {
    clearTimeout(timeoutId);
  };
};

export const hasPersistedLearnerSessionHint = (
  storage: ReturnType<typeof useKangurMobileRuntime>['storage'],
): boolean =>
  storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) === 'authenticated';
