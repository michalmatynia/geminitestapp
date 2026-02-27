'use client';

import React, { useCallback } from 'react';
import { 
  CASE_RESOLVER_SETTINGS_KEY, 
  parseCaseResolverSettings 
} from '../settings';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import type { Toast } from '@/shared/contracts/ui';

export function useCaseResolverAssetFactoryActions({
  settingsStoreRef,
  toast,
  activeCaseId,
  requestedCaseStatus,
  setSelectedFileId,
  setSelectedFolderPath,
  setSelectedAssetId,
  treeSaveToast,
}: {
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
}) {
  const handleCreateScanFile = useCallback((targetFolderPath: string | null): void => {
    const rawSettings = settingsStoreRef.current.get(CASE_RESOLVER_SETTINGS_KEY);
    parseCaseResolverSettings(rawSettings);
    
    if (!activeCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create image file without a selected case.',
        { variant: 'warning' }
      );
      return;
    }

    const name = `New Scan File ${new Date().toLocaleTimeString()}`;
    const id = `scan-file-${Date.now()}`;

    toast(`${treeSaveToast}: ${name} created.`, { variant: 'success' });
    setSelectedFileId(id);
    if (targetFolderPath) {
      setSelectedFolderPath(targetFolderPath);
    }
  }, [activeCaseId, requestedCaseStatus, setSelectedFileId, setSelectedFolderPath, settingsStoreRef, toast, treeSaveToast]);

  const handleCreateAsset = useCallback((): void => {
    if (!activeCaseId) {
      toast('Cannot create asset without a selected case.', { variant: 'warning' });
      return;
    }

    const id = `asset-${Date.now()}`;
    setSelectedAssetId(id);
    toast('New asset created.', { variant: 'success' });
  }, [activeCaseId, setSelectedAssetId, toast]);

  return {
    handleCreateScanFile,
    handleCreateAsset,
  };
}
