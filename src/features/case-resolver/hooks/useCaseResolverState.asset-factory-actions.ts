'use client';

import type React from 'react';
import { useCallback } from 'react';

import { createId } from '@/features/case-resolver/utils/caseResolverUtils';
import type { CaseResolverAssetFile } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import type { Toast } from '@/shared/contracts/ui/base';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';

import {
  appendOwnedFolderRecords,
  createUniqueCaseFileName,
  resolveCaseScopedFolderTarget,
} from './useCaseResolverState.helpers';
import { CASE_RESOLVER_SETTINGS_KEY, parseCaseResolverSettings } from '../settings';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeFolderPaths,
} from '../settings';


export function useCaseResolverAssetFactoryActions({
  settingsStoreRef,
  toast,
  updateWorkspace,
  workspace,
  defaultTagId,
  defaultCaseIdentifierId,
  defaultCategoryId,
  activeCaseId,
  requestedCaseStatus,
  setSelectedFileId,
  setSelectedFolderPath,
  setSelectedAssetId,
  treeSaveToast,
}: {
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  workspace: CaseResolverWorkspace;
  defaultTagId: string | null;
  defaultCaseIdentifierId: string | null;
  defaultCategoryId: string | null;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
}) {
  const createUniqueAssetName = useCallback(
    ({ folder, baseName }: { folder: string; baseName: string }): string => {
      const normalizedBaseName = baseName.trim() || 'New Asset';
      const existingNames = new Set(
        workspace.assets
          .filter((asset: CaseResolverAssetFile): boolean => asset.folder === folder)
          .map((asset: CaseResolverAssetFile): string => asset.name.trim().toLowerCase())
      );
      if (!existingNames.has(normalizedBaseName.toLowerCase())) {
        return normalizedBaseName;
      }
      let index = 2;
      while (index < 10000) {
        const candidate = `${normalizedBaseName} ${index}`;
        if (!existingNames.has(candidate.toLowerCase())) {
          return candidate;
        }
        index += 1;
      }
      return `${normalizedBaseName} ${Date.now()}`;
    },
    [workspace.assets]
  );

  const handleCreateScanFile = useCallback(
    (targetFolderPath: string | null): void => {
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

      let createdScanFileId: string | null = null;
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const folder = resolveCaseScopedFolderTarget({
            targetFolderPath,
            ownerCaseId: activeCaseId,
            folderRecords: current.folderRecords,
          });
          const file = createCaseResolverFile({
            id: createId('scan-file'),
            workspaceId: current.id,
            fileType: 'scanfile',
            name: createUniqueCaseFileName({
              files: current.files,
              folder,
              baseName: 'New Scan File',
            }),
            folder,
            parentCaseId: activeCaseId,
            tagId: defaultTagId,
            caseIdentifierId: defaultCaseIdentifierId,
            categoryId: defaultCategoryId,
            scanSlots: [],
          });
          createdScanFileId = file.id;
          return {
            ...current,
            files: [...current.files, file],
            folders: normalizeFolderPaths([...current.folders, folder]),
            folderRecords: appendOwnedFolderRecords({
              records: current.folderRecords,
              folderPath: folder,
              ownerCaseId: activeCaseId,
            }),
          };
        },
        { persistToast: treeSaveToast }
      );
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      if (createdScanFileId) {
        setSelectedFileId(createdScanFileId);
      }
    },
    [
      activeCaseId,
      createUniqueCaseFileName,
      defaultCaseIdentifierId,
      defaultCategoryId,
      defaultTagId,
      requestedCaseStatus,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      settingsStoreRef,
      toast,
      treeSaveToast,
      updateWorkspace,
    ]
  );

  const handleCreateImageAsset = useCallback(
    (targetFolderPath: string | null): void => {
      if (!activeCaseId) {
        toast(
          requestedCaseStatus === 'loading'
            ? 'Case context is still loading. Please wait.'
            : 'Cannot create image asset without a selected case.',
          { variant: 'warning' }
        );
        return;
      }

      let createdAssetId: string | null = null;
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const folder = resolveCaseScopedFolderTarget({
            targetFolderPath,
            ownerCaseId: activeCaseId,
            folderRecords: current.folderRecords,
          });
          const asset = createCaseResolverAssetFile({
            id: createId('asset'),
            workspaceId: current.id,
            name: createUniqueAssetName({
              folder,
              baseName: 'New Image',
            }),
            folder,
            kind: 'image',
          });
          createdAssetId = asset.id;
          return {
            ...current,
            assets: [...current.assets, asset],
            folders: normalizeFolderPaths([...current.folders, folder]),
            folderRecords: appendOwnedFolderRecords({
              records: current.folderRecords,
              folderPath: folder,
              ownerCaseId: activeCaseId,
            }),
          };
        },
        { persistToast: treeSaveToast }
      );
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      if (createdAssetId) {
        setSelectedAssetId(createdAssetId);
      }
    },
    [
      activeCaseId,
      createUniqueAssetName,
      requestedCaseStatus,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
    ]
  );

  const handleCreateNodeFile = useCallback(
    (targetFolderPath: string | null): void => {
      if (!activeCaseId) {
        toast(
          requestedCaseStatus === 'loading'
            ? 'Case context is still loading. Please wait.'
            : 'Cannot create node file without a selected case.',
          { variant: 'warning' }
        );
        return;
      }

      let createdAssetId: string | null = null;
      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const folder = resolveCaseScopedFolderTarget({
            targetFolderPath,
            ownerCaseId: activeCaseId,
            folderRecords: current.folderRecords,
          });
          const asset = createCaseResolverAssetFile({
            id: createId('asset'),
            workspaceId: current.id,
            name: createUniqueAssetName({
              folder,
              baseName: 'New Node File',
            }),
            folder,
            kind: 'node_file',
            metadata: {
              ownerCaseId: activeCaseId,
            },
          });
          createdAssetId = asset.id;
          return {
            ...current,
            assets: [...current.assets, asset],
            folders: normalizeFolderPaths([...current.folders, folder]),
            folderRecords: appendOwnedFolderRecords({
              records: current.folderRecords,
              folderPath: folder,
              ownerCaseId: activeCaseId,
            }),
          };
        },
        { persistToast: treeSaveToast }
      );
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      if (createdAssetId) {
        setSelectedAssetId(createdAssetId);
      }
    },
    [
      activeCaseId,
      createUniqueAssetName,
      requestedCaseStatus,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
    ]
  );

  return {
    handleCreateScanFile,
    handleCreateImageAsset,
    handleCreateNodeFile,
  };
}
