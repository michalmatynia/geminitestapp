'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  getKangurProgressServerSnapshot,
  loadProgress,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) =>
  subscribeToProgress(() => onStoreChange());

export const useKangurProgressState = () => {
  const { subjectKey } = useKangurSubjectFocus();
  const getSnapshot = useCallback(
    () => loadProgress({ ownerKey: subjectKey }),
    [subjectKey]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getKangurProgressServerSnapshot);
};
