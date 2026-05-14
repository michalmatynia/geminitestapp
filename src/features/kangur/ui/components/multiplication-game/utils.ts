import type React from 'react';
import { safeClearTimeout } from '@/shared/lib/timers';

export const clearMultiplicationArrayAdvanceTimeout = (
  advanceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
): void => {
  const ref = advanceTimeoutRef;
  const timeout = ref.current;
  if (timeout !== null) {
    safeClearTimeout(timeout);
    ref.current = null;
  }
};
