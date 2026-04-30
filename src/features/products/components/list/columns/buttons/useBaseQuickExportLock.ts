'use client';

import { useCallback, useRef, useState } from 'react';

import { oneClickExportInFlight } from './BaseQuickExportButton.constants';

export type BaseQuickExportLock = {
  locked: boolean;
  acquire: () => boolean;
  release: () => void;
};

export const useBaseQuickExportLock = (productId: string): BaseQuickExportLock => {
  const quickExportLockRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const acquire = useCallback((): boolean => {
    if (quickExportLockRef.current || oneClickExportInFlight.has(productId)) return false;
    quickExportLockRef.current = true;
    setLocked(true);
    oneClickExportInFlight.add(productId);
    return true;
  }, [productId]);

  const release = useCallback((): void => {
    quickExportLockRef.current = false;
    setLocked(false);
    oneClickExportInFlight.delete(productId);
  }, [productId]);

  return { locked, acquire, release };
};
