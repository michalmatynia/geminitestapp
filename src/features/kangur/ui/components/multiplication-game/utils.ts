import React from 'react';
import { safeClearTimeout } from '@/shared/lib/timers';

export const clearMultiplicationArrayAdvanceTimeout = (
  advanceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
): void => {
  if (advanceTimeoutRef.current !== null) {
    safeClearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  }
};
