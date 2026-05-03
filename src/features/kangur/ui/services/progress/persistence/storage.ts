import { KANGUR_PROGRESS_STORAGE_KEY, KANGUR_PROGRESS_OWNER_STORAGE_KEY } from '../../progress.contracts';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const saveToLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (err: unknown) {
    logClientError(err instanceof Error ? err : new Error('Storage save failed'));
  }
};

export const getFromLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (err: unknown) {
    logClientError(err instanceof Error ? err : new Error('Storage read failed'));
    return null;
  }
};

export const clearProgressStorage = (): void => {
  try {
    localStorage.removeItem(KANGUR_PROGRESS_STORAGE_KEY);
    localStorage.removeItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY);
  } catch (err: unknown) {
    logClientError(new Error('Storage clear failed'));
  }
};
