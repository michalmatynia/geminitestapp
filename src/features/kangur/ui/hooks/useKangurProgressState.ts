'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import {
  getKangurProgressServerSnapshot,
  loadProgress,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) =>
  subscribeToProgress(() => onStoreChange());

export const useKangurProgressState = () => {
  const ownerKey = useKangurProgressOwnerKey();
  const getSnapshot = useCallback(
    () => loadProgress({ ownerKey }),
    [ownerKey]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getKangurProgressServerSnapshot);
};
