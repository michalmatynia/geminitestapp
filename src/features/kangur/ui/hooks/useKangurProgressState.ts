'use client';

import { useSyncExternalStore } from 'react';

import {
  getKangurProgressServerSnapshot,
  loadProgress,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) =>
  subscribeToProgress(() => onStoreChange());

export const useKangurProgressState = () =>
  useSyncExternalStore(subscribe, loadProgress, getKangurProgressServerSnapshot);
