'use client';

import { useRef, useSyncExternalStore } from 'react';

import type { CaseResolverRuntimeSelector, CaseResolverRuntimeSnapshot } from '../types';
import type { CaseResolverRuntimeStore } from '../store';

const defaultEquality = <T,>(left: T, right: T): boolean => Object.is(left, right);

export function useCaseResolverSelector<T>(
  store: CaseResolverRuntimeStore,
  selector: CaseResolverRuntimeSelector<T>,
  equalityFn: (left: T, right: T) => boolean = defaultEquality,
): T {
  const cachedRef = useRef<T | null>(null);
  const hasCachedValueRef = useRef(false);

  return useSyncExternalStore(
    store.subscribe,
    (): T => {
      const snapshot: CaseResolverRuntimeSnapshot = store.getSnapshot();
      const nextValue = selector(snapshot);
      if (hasCachedValueRef.current) {
        const current = cachedRef.current as T;
        if (equalityFn(current, nextValue)) {
          return current;
        }
      }
      cachedRef.current = nextValue;
      hasCachedValueRef.current = true;
      return nextValue;
    },
    (): T => selector(store.getSnapshot()),
  );
}
