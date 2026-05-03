import { 
  KANGUR_PROGRESS_STORAGE_KEY, 
  KANGUR_PROGRESS_OWNER_STORAGE_KEY 
} from '../progress.contracts';
import { 
  type KangurProgressStorageOptions 
} from './persistence/storage';
import { getFromLocalStorage, saveToLocalStorage } from './persistence/storage';
import { normalizeOwnerKey } from './persistence/serialization';
import type { KangurProgressState } from '@/features/kangur/ui/types';

export const loadProgress = (options?: KangurProgressStorageOptions): KangurProgressState | null => {
  const ownerKey = options?.ownerKey !== null && options?.ownerKey !== undefined ? normalizeOwnerKey(options.ownerKey) : null;
  const storageKey = (ownerKey !== null && ownerKey.length > 0) 
    ? `${KANGUR_PROGRESS_STORAGE_KEY}:${ownerKey}` 
    : KANGUR_PROGRESS_STORAGE_KEY;
  const raw = getFromLocalStorage(storageKey);
  return raw ? JSON.parse(raw) as KangurProgressState : null;
};

export const saveProgress = (progress: KangurProgressState, options?: KangurProgressStorageOptions): void => {
  const ownerKey = options?.ownerKey !== null && options?.ownerKey !== undefined ? normalizeOwnerKey(options.ownerKey) : null;
  const storageKey = (ownerKey !== null && ownerKey.length > 0) 
    ? `${KANGUR_PROGRESS_STORAGE_KEY}:${ownerKey}` 
    : KANGUR_PROGRESS_STORAGE_KEY;
  saveToLocalStorage(storageKey, JSON.stringify(progress));
};
