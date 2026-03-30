'use client';

import { useEffect, useRef } from 'react';

type UseKangurSerializedSnapshotSyncOptions = {
  clearSnapshot: () => void;
  initialSerializedSnapshot?: string | null;
  onSerializedSnapshotChange?: (raw: string | null) => void;
  restoreSerializedSnapshot: (raw: string) => boolean;
  serializedSnapshot: string | null;
};

export const useKangurSerializedSnapshotSync = ({
  clearSnapshot,
  initialSerializedSnapshot = null,
  onSerializedSnapshotChange,
  restoreSerializedSnapshot,
  serializedSnapshot,
}: UseKangurSerializedSnapshotSyncOptions): void => {
  const previousIncomingSnapshotRef = useRef<string | null | undefined>(undefined);
  const skipSnapshotEmissionRef = useRef(Boolean(initialSerializedSnapshot));

  useEffect(() => {
    if (initialSerializedSnapshot === previousIncomingSnapshotRef.current) {
      return;
    }

    previousIncomingSnapshotRef.current = initialSerializedSnapshot;

    if (initialSerializedSnapshot === serializedSnapshot) {
      skipSnapshotEmissionRef.current = false;
      return;
    }

    if (!initialSerializedSnapshot) {
      skipSnapshotEmissionRef.current = true;
      if (serializedSnapshot) {
        clearSnapshot();
      }
      return;
    }

    skipSnapshotEmissionRef.current = restoreSerializedSnapshot(
      initialSerializedSnapshot
    );
  }, [
    clearSnapshot,
    initialSerializedSnapshot,
    restoreSerializedSnapshot,
    serializedSnapshot,
  ]);

  useEffect(() => {
    if (!onSerializedSnapshotChange) {
      return;
    }

    if (
      skipSnapshotEmissionRef.current &&
      serializedSnapshot !== initialSerializedSnapshot
    ) {
      return;
    }

    skipSnapshotEmissionRef.current = false;
    onSerializedSnapshotChange(serializedSnapshot);
  }, [initialSerializedSnapshot, onSerializedSnapshotChange, serializedSnapshot]);
};
