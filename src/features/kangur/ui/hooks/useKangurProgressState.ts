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

type UseKangurProgressStateOptions = {
  enabled?: boolean;
};

const subscribeDisabled = (): (() => void) => () => {};

type KangurProgressStateSnapshot = ReturnType<typeof loadProgress>;

export const useKangurProgressState = (
  options: UseKangurProgressStateOptions = {}
): KangurProgressStateSnapshot => {
  const enabled = options.enabled ?? true;
  const ownerKey = useKangurProgressOwnerKey();
  const getSnapshot = useCallback(
    () => (enabled ? loadProgress({ ownerKey }) : getKangurProgressServerSnapshot()),
    [enabled, ownerKey]
  );

  return useSyncExternalStore(
    enabled ? subscribe : subscribeDisabled,
    getSnapshot,
    getKangurProgressServerSnapshot
  );
};
