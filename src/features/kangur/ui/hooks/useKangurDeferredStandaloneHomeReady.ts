'use client';

import { useRef } from 'react';

import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

import { useKangurIdleReady } from './useKangurIdleReady';

export function useKangurDeferredStandaloneHomeReady(): boolean {
  const { pageKey, embedded } = useKangurRouting();
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const shouldDelayInitialMountRef = useRef<boolean | null>(null);

  shouldDelayInitialMountRef.current ??= !embedded && resolvedPageKey === 'Game';
  const shouldDelayInitialMount = shouldDelayInitialMountRef.current;
  const isIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayInitialMount ? GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS : 0,
  });

  return !shouldDelayInitialMount || isIdleReady;
}
