'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

const DRAWING_DRAFT_STORAGE_PREFIX = 'kangur-drawing-draft-v1:';
export const KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS = 120;

const resolveDrawingDraftStorageKey = (storageKey: string): string =>
  `${DRAWING_DRAFT_STORAGE_PREFIX}${storageKey}`;

export const loadKangurDrawingDraftSnapshot = (storageKey: string | null): string | null => {
  if (!storageKey || typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(resolveDrawingDraftStorageKey(storageKey));
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

export const persistKangurDrawingDraftSnapshot = (
  storageKey: string | null,
  snapshot: string | null
): void => {
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  const resolvedStorageKey = resolveDrawingDraftStorageKey(storageKey);

  if (typeof snapshot === 'string' && snapshot.length > 0) {
    window.sessionStorage.setItem(resolvedStorageKey, snapshot);
    return;
  }

  window.sessionStorage.removeItem(resolvedStorageKey);
};

export const useKangurDrawingDraftStorage = (storageKey: string | null) => {
  const [draftSnapshot, setDraftSnapshotState] = useState<string | null>(() =>
    loadKangurDrawingDraftSnapshot(storageKey)
  );
  const activeStorageKeyRef = useRef<string | null>(storageKey);
  const draftSnapshotRef = useRef<string | null>(draftSnapshot);
  const persistTimeoutRef = useRef<number | null>(null);

  const flushPendingPersist = useCallback(() => {
    if (persistTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }

    persistKangurDrawingDraftSnapshot(
      activeStorageKeyRef.current,
      draftSnapshotRef.current
    );
  }, []);

  useLayoutEffect(() => {
    if (activeStorageKeyRef.current === storageKey) {
      return;
    }

    flushPendingPersist();
    activeStorageKeyRef.current = storageKey;
    const nextDraftSnapshot = loadKangurDrawingDraftSnapshot(storageKey);
    draftSnapshotRef.current = nextDraftSnapshot;
    setDraftSnapshotState(nextDraftSnapshot);
  }, [flushPendingPersist, storageKey]);

  const schedulePersist = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null;
      persistKangurDrawingDraftSnapshot(
        activeStorageKeyRef.current,
        draftSnapshotRef.current
      );
    }, KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);
  }, []);

  useEffect(
    () => () => {
      flushPendingPersist();
    },
    [flushPendingPersist]
  );

  const setDraftSnapshot = useCallback<Dispatch<SetStateAction<string | null>>>(
    (nextSnapshot) => {
      const resolvedSnapshot =
        typeof nextSnapshot === 'function'
          ? nextSnapshot(draftSnapshotRef.current)
          : nextSnapshot;

      draftSnapshotRef.current = resolvedSnapshot;
      schedulePersist();
    },
    [schedulePersist]
  );

  const clearDraftSnapshot = useCallback(() => {
    draftSnapshotRef.current = null;
    setDraftSnapshotState(null);
    schedulePersist();
  }, [schedulePersist]);

  return {
    clearDraftSnapshot,
    draftSnapshot,
    setDraftSnapshot,
  };
};
