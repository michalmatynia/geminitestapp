import { useCallback, useMemo } from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { logCaseResolverWorkspaceEvent } from '../workspace-persistence';

type UpdateWorkspaceOptions = {
  persistToast?: string;
  persistNow?: boolean;
  mutationId?: string;
  source?: string;
};

type UpdateWorkspaceFn = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: UpdateWorkspaceOptions
) => void;

type UseCaseResolverStateSelectionActionsInput = {
  workspace: CaseResolverWorkspace;
  selectedAssetId: string | null;
  updateWorkspace: UpdateWorkspaceFn;
  treeSaveToast: string;
};

type UseCaseResolverStateSelectionActionsResult = {
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  handleUpdateSelectedAsset: (
    patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>,
    options?: UpdateWorkspaceOptions
  ) => void;
  handleUpdateActiveFileParties: (
    patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>
  ) => void;
};

export const useCaseResolverStateSelectionActions = ({
  workspace,
  selectedAssetId,
  updateWorkspace,
  treeSaveToast,
}: UseCaseResolverStateSelectionActionsInput): UseCaseResolverStateSelectionActionsResult => {
  const activeFile = useMemo(
    (): CaseResolverFile | null =>
      workspace.activeFileId
        ? workspace.files.find((file: CaseResolverFile) => file.id === workspace.activeFileId) ?? null
        : null,
    [workspace.activeFileId, workspace.files]
  );

  const selectedAsset = useMemo(
    (): CaseResolverAssetFile | null =>
      selectedAssetId
        ? workspace.assets.find((asset: CaseResolverAssetFile) => asset.id === selectedAssetId) ?? null
        : null,
    [selectedAssetId, workspace.assets]
  );

  const handleUpdateSelectedAsset = useCallback(
    (
      patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>,
      options?: UpdateWorkspaceOptions
    ): void => {
      if (!selectedAssetId) return;
      const resolvedOptions: UpdateWorkspaceOptions = options ?? {
        persistToast: treeSaveToast,
      };
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === selectedAssetId
            ? {
              ...asset,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }), resolvedOptions);
      if (resolvedOptions.source === 'node_file_manual_save') {
        logCaseResolverWorkspaceEvent({
          source: resolvedOptions.source,
          action: 'node_file_snapshot_manual_save',
          message: `asset_id=${selectedAssetId} persist_now=${resolvedOptions.persistNow === true ? 'true' : 'false'}`,
        });
      }
    },
    [selectedAssetId, treeSaveToast, updateWorkspace]
  );

  const handleUpdateActiveFileParties = useCallback(
    (patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>): void => {
      if (!workspace.activeFileId) return;
      updateWorkspace((current: CaseResolverWorkspace) => {
        const activeFile = current.files.find((file: CaseResolverFile) => file.id === current.activeFileId) ?? null;
        if (activeFile?.isLocked) return current;
        return {
          ...current,
          files: current.files.map((file: CaseResolverFile) =>
            file.id === current.activeFileId
              ? { ...file, ...patch, updatedAt: new Date().toISOString() }
              : file
          ),
        };
      }, { persistToast: 'Parties updated.' });
    },
    [updateWorkspace, workspace.activeFileId]
  );

  return {
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    handleUpdateActiveFileParties,
  };
};
