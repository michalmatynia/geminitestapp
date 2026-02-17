import { useCallback, useMemo } from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '../types';

type UpdateWorkspaceOptions = {
  persistToast?: string;
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
  handleUpdateSelectedAsset: (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>) => void;
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
        ? workspace.files.find((file) => file.id === workspace.activeFileId) ?? null
        : null,
    [workspace.activeFileId, workspace.files]
  );

  const selectedAsset = useMemo(
    (): CaseResolverAssetFile | null =>
      selectedAssetId
        ? workspace.assets.find((asset) => asset.id === selectedAssetId) ?? null
        : null,
    [selectedAssetId, workspace.assets]
  );

  const handleUpdateSelectedAsset = useCallback(
    (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>): void => {
      if (!selectedAssetId) return;
      updateWorkspace((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === selectedAssetId
            ? {
              ...asset,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }), { persistToast: treeSaveToast });
    },
    [selectedAssetId, treeSaveToast, updateWorkspace]
  );

  const handleUpdateActiveFileParties = useCallback(
    (patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>): void => {
      if (!workspace.activeFileId) return;
      updateWorkspace((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === current.activeFileId
            ? { ...file, ...patch, updatedAt: new Date().toISOString() }
            : file
        ),
      }), { persistToast: 'Parties updated.' });
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
