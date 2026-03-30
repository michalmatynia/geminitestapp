'use client';

import { useEffect } from 'react';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import type { UseNumberBalanceRushLifecycleEffectsProps } from './NumberBalanceRushGame.types';
import {
  clearNumberBalanceRushTimeouts,
} from './NumberBalanceRushGame.runtime';

export function useNumberBalanceRushLifecycleEffects({
  celebrateTimeoutRef,
  copyStatusTimeoutRef,
  initMatch,
  matchId,
  setClockNowMs,
}: UseNumberBalanceRushLifecycleEffectsProps) {
  useEffect(() => {
    return () => {
      clearNumberBalanceRushTimeouts({
        celebrateTimeoutId: celebrateTimeoutRef.current,
        copyStatusTimeoutId: copyStatusTimeoutRef.current,
      });
    };
  }, [celebrateTimeoutRef, copyStatusTimeoutRef]);

  useEffect(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  useInterval(() => {
    setClockNowMs(Date.now());
  }, 100);
}
