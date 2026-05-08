/**
 * Debounce Hook
 * 
 * React hook for debouncing rapidly changing values.
 * Provides:
 * - Configurable delay for value updates
 * - Automatic cleanup of pending timers
 * - Type-safe value handling
 * - Performance optimization for search inputs and form fields
 * - Memory leak prevention with proper timer management
 */

'use client';

import { useEffect, useState } from 'react';
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
