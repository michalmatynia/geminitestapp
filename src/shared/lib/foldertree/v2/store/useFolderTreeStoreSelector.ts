'use client';

import { useRef, useSyncExternalStore } from 'react';

import type { FolderTreeStore } from './createFolderTreeStore';

const defaultEquality = <T,>(left: T, right: T): boolean => Object.is(left, right);

export function useFolderTreeStoreSelector<T>(
  store: FolderTreeStore,
  selector: (snapshot: ReturnType<FolderTreeStore['getSnapshot']>) => T,
  equalityFn: (left: T, right: T) => boolean = defaultEquality
): T {
  const cachedRef = useRef<T | null>(null);
  const hasCachedValueRef = useRef(false);

  return useSyncExternalStore(
    store.subscribe,
    () => {
      const nextValue = selector(store.getSnapshot());
      if (hasCachedValueRef.current) {
        const cachedValue = cachedRef.current as T;
        if (equalityFn(cachedValue, nextValue)) {
          return cachedValue;
        }
      }
      cachedRef.current = nextValue;
      hasCachedValueRef.current = true;
      return nextValue;
    },
    () => selector(store.getSnapshot())
  );
}
