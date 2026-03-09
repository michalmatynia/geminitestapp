'use client';

import { useSyncExternalStore } from 'react';

import {
  getKangurProgressServerSnapshot,
  KANGUR_PROGRESS_EVENT_NAME,
  KANGUR_PROGRESS_STORAGE_KEY,
  loadProgress,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) =>
  subscribeToProgress(() => onStoreChange());

export const useKangurProgressState = () =>
  useSyncExternalStore(subscribe, loadProgress, getKangurProgressServerSnapshot);
