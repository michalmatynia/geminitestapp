import { useRef } from 'react';

import type {
  CaseResolverAssetKind,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
  CaseResolverAssetFile,
} from '@/shared/contracts/case-resolver';

import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import type { Toast } from '@/shared/contracts/ui';

import { useCaseResolverStateOcrActions } from './useCaseResolverState.ocr-actions';
import { useCaseResolverStateUploadActions } from './useCaseResolverState.upload-actions';
import { useCaseResolverAssetFactoryActions } from './useCaseResolverState.asset-factory-actions';

type CaseResolverRequestedCaseStatus = 'loading' | 'ready' | 'missing';

type UseCaseResolverStateAssetActionsInput = {
  settingsStore: SettingsStoreValue;
  toast: Toast;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: { persistToast?: string; persistNow?: boolean; mutationId?: string; source?: string; skipNormalization?: boolean }
  ) => void;
  workspace: CaseResolverWorkspace;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setIsUploadingScanDraftFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadingScanSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  defaultTagId: string | null;
  defaultCaseIdentifierId: string | null;
  defaultCategoryId: string | null;
  activeCaseId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
};

export type UseCaseResolverStateAssetActionsResult = {
  handleCreateScanFile: (targetFolderPath: string | null) => void;
  handleCreateNodeFile: (targetFolderPath: string | null) => void;
  handleUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  handleRunScanFileOcr: (fileId: string) => Promise<void>;
  handleCreateDocumentFromText: (scanFileId: string) => void;
  handleCreateImageAsset: (targetFolderPath: string | null) => void;
  handleUploadAssets: (files: File[], targetFolderPath: string | null) => Promise<CaseResolverAssetFile[]>;
  handleAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
};

export const useCaseResolverStateAssetActions = (
  input: UseCaseResolverStateAssetActionsInput
): UseCaseResolverStateAssetActionsResult => {
  const settingsStoreRef = useRef(input.settingsStore);
  settingsStoreRef.current = input.settingsStore;

  const ocrActions = useCaseResolverStateOcrActions({
    settingsStoreRef,
    toast: input.toast,
    updateWorkspace: input.updateWorkspace,
    workspace: input.workspace,
    editingDocumentDraft: input.editingDocumentDraft,
    setEditingDocumentDraft: input.setEditingDocumentDraft,
    setIsUploadingScanDraftFiles: input.setIsUploadingScanDraftFiles,
    setUploadingScanSlotId: input.setUploadingScanSlotId,
    treeSaveToast: input.treeSaveToast,
  });

  const uploadActions = useCaseResolverStateUploadActions({
    toast: input.toast,
    updateWorkspace: input.updateWorkspace,
    workspace: input.workspace,
    setEditingDocumentDraft: input.setEditingDocumentDraft,
    setSelectedFileId: input.setSelectedFileId,
    setSelectedAssetId: input.setSelectedAssetId,
    setSelectedFolderPath: input.setSelectedFolderPath,
    treeSaveToast: input.treeSaveToast,
  });

  const factoryActions = useCaseResolverAssetFactoryActions({
    settingsStoreRef,
    toast: input.toast,
    activeCaseId: input.activeCaseId,
    requestedCaseStatus: input.requestedCaseStatus,
    setSelectedFileId: input.setSelectedFileId,
    setSelectedFolderPath: input.setSelectedFolderPath,
    setSelectedAssetId: input.setSelectedAssetId,
    treeSaveToast: input.treeSaveToast,
  });

  return {
    ...factoryActions,
    ...uploadActions,
    ...ocrActions,
    handleCreateNodeFile: (targetFolderPath: string | null) => {
      // Placeholder for missing method
      console.log('handleCreateNodeFile placeholder', targetFolderPath);
    },
    handleCreateDocumentFromText: (scanFileId: string) => {
      // Placeholder for missing method
      console.log('handleCreateDocumentFromText placeholder', scanFileId);
    },
    handleCreateImageAsset: (targetFolderPath: string | null) => {
      // Placeholder for missing method
      console.log('handleCreateImageAsset placeholder', targetFolderPath);
    },
  };
};
