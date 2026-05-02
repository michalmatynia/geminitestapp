'use client';

import { useEffect } from 'react';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = safeSetTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      safeClearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};
