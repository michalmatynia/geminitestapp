'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { incrementCaseResolverCounterMetric } from '../metrics';

import type { CaseResolverRuntimeStore } from '../store';
import type { CaseResolverRuntimeSelector, CaseResolverRuntimeSnapshot } from '../types';

const defaultEquality = <T>(left: T, right: T): boolean => Object.is(left, right);

export function useCaseResolverSelector<T>(
  store: CaseResolverRuntimeStore,
  selector: CaseResolverRuntimeSelector<T>,
  equalityFn: (left: T, right: T) => boolean = defaultEquality
): T {
  const cachedRef = useRef<T | null>(null);
  const hasCachedValueRef = useRef(false);
  const pendingSelectorRecomputeCountRef = useRef(0);

  const selectedValue = useSyncExternalStore(
    store.subscribe,
    (): T => {
      const snapshot: CaseResolverRuntimeSnapshot = store.getSnapshot();
      const nextValue = selector(snapshot);
      if (hasCachedValueRef.current) {
        const current = cachedRef.current as T;
        if (equalityFn(current, nextValue)) {
          return current;
        }
        pendingSelectorRecomputeCountRef.current += 1;
      }
      cachedRef.current = nextValue;
      hasCachedValueRef.current = true;
      return nextValue;
    },
    (): T => selector(store.getSnapshot())
  );

  useEffect((): void => {
    const pendingCount = pendingSelectorRecomputeCountRef.current;
    if (pendingCount <= 0) return;
    pendingSelectorRecomputeCountRef.current = 0;
    incrementCaseResolverCounterMetric('selector_recompute_count', {
      count: pendingCount,
      source: 'runtime_store',
    });
  });

  return selectedValue;
}
