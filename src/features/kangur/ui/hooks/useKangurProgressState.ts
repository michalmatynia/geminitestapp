'use client';

import { useSyncExternalStore } from 'react';

import {
  getKangurProgressServerSnapshot,
  KANGUR_PROGRESS_EVENT_NAME,
  KANGUR_PROGRESS_STORAGE_KEY,
  loadProgress,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) => {
  const unsubscribe = subscribeToProgress(() => onStoreChange());

  if (typeof window === 'undefined') {
    return unsubscribe;
  }

  const handleWindowChange = (event: Event): void => {
    if (event instanceof StorageEvent && event.key && event.key !== KANGUR_PROGRESS_STORAGE_KEY) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener('storage', handleWindowChange);
  window.addEventListener(KANGUR_PROGRESS_EVENT_NAME, handleWindowChange);

  return () => {
    unsubscribe();
    window.removeEventListener('storage', handleWindowChange);
    window.removeEventListener(KANGUR_PROGRESS_EVENT_NAME, handleWindowChange);
  };
};

export const useKangurProgressState = () =>
  useSyncExternalStore(subscribe, loadProgress, getKangurProgressServerSnapshot);
