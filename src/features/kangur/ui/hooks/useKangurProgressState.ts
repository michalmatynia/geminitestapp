'use client';

import { useSyncExternalStore } from 'react';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { loadProgress, subscribeToProgress } from '@/features/kangur/ui/services/progress';

const subscribe = (onStoreChange: () => void): (() => void) =>
  subscribeToProgress(() => onStoreChange());

export const useKangurProgressState = () =>
  useSyncExternalStore(subscribe, loadProgress, createDefaultKangurProgressState);
