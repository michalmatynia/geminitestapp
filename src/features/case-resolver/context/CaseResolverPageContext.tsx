'use client';

import React from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverCategory,
  CaseResolverEditorNodeContext,
  CaseResolverFile,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
  CaseResolverWorkspace,
  CaseMetadataDraft,
} from '@/shared/contracts/case-resolver';

type CaseResolverAssetPatch = Partial<
  Pick<CaseResolverAssetFile, 'textContent' | 'description' | 'metadata'>
>;
type CaseResolverAssetUpdateOptions = {
  persistToast?: string;
  persistNow?: boolean;
  source?: string;
};

export type CaseResolverPageContextValue = {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  requestedCaseIssue: 'requested_file_missing' | 'workspace_unavailable' | null;
  canCreateInActiveCase: boolean;
  onRetryCaseContext: () => void;
  onResetCaseContext: () => void;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  panelCollapsed: boolean;
  onPanelCollapsedChange: (collapsed: boolean) => void;
  onDeactivateActiveFile: () => void;
  onSelectFile: (fileId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectFolder: (folderPath: string | null) => void;
  onCreateFolder: (targetFolderPath: string | null) => void;
  onCreateFile: (targetFolderPath: string | null) => void;
  onCreateScanFile: (targetFolderPath: string | null) => void;
  onCreateNodeFile: (targetFolderPath: string | null) => void;
  onCreateImageAsset: (targetFolderPath: string | null) => void;
  onUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  onRunScanFileOcr: (fileId: string) => Promise<void>;
  onUploadAssets: (
    files: File[],
    targetFolderPath: string | null
  ) => Promise<CaseResolverAssetFile[]>;
  onAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
  onMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  onMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  onMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  onRenameFile: (fileId: string, nextName: string) => Promise<void>;
  onRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  onRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  onDeleteFolder: (folderPath: string) => void;
  onToggleFolderLock: (folderPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onToggleFileLock: (fileId: string) => void;
  onEditFile: (
    fileId: string,
    options?: { nodeContext?: CaseResolverEditorNodeContext | null }
  ) => void;
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  onCreateDocumentFromSearch: () => void;
  onOpenFileFromSearch: (fileId: string) => void;
  onEditFileFromSearch: (fileId: string) => void;
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  onUpdateSelectedAsset: (
    patch: CaseResolverAssetPatch,
    options?: CaseResolverAssetUpdateOptions
  ) => void;
  onGraphChange: (nextGraph: CaseResolverGraph) => void;
  onRelationGraphChange: (nextGraph: CaseResolverRelationGraph) => void;
  onLinkRelatedFiles: (fileIdA: string, fileIdB: string) => void;
  onUnlinkRelatedFile: (sourceFileId: string, targetFileId: string) => void;
  onUpdateActiveCase: (
    patch: Partial<
      Pick<
        CaseResolverFile,
        | 'name'
        | 'parentCaseId'
        | 'referenceCaseIds'
        | 'tagId'
        | 'caseIdentifierId'
        | 'categoryId'
        | 'caseStatus'
        | 'happeningDate'
      >
    >
  ) => void;
  activeCaseFile: CaseResolverFile | null;
  activeCaseMetadataDraft: CaseMetadataDraft | null;
  isActiveCaseMetadataDirty: boolean;
  onUpdateActiveCaseDraft: (patch: Partial<CaseMetadataDraft>) => void;
  onSaveActiveCase: () => void;
  onDiscardActiveCaseChanges: () => void;
  caseTagOptions: Array<{ value: string; label: string; description?: string }>;
  caseIdentifierOptions: Array<{ value: string; label: string; description?: string }>;
  caseCategoryOptions: Array<{ value: string; label: string; description?: string }>;
  caseReferenceOptions: Array<{ value: string; label: string; description?: string }>;
  parentCaseOptions: Array<{ value: string; label: string; description?: string }>;
  partyOptions: Array<{ value: string; label: string; description?: string }>;
};

type CaseResolverPageActionKey =
  | 'onRetryCaseContext'
  | 'onResetCaseContext'
  | 'onPanelCollapsedChange'
  | 'onDeactivateActiveFile'
  | 'onSelectFile'
  | 'onSelectAsset'
  | 'onSelectFolder'
  | 'onCreateFolder'
  | 'onCreateFile'
  | 'onCreateScanFile'
  | 'onCreateNodeFile'
  | 'onCreateImageAsset'
  | 'onUploadScanFiles'
  | 'onRunScanFileOcr'
  | 'onUploadAssets'
  | 'onAttachAssetFile'
  | 'onMoveFile'
  | 'onMoveAsset'
  | 'onMoveFolder'
  | 'onRenameFile'
  | 'onRenameAsset'
  | 'onRenameFolder'
  | 'onDeleteFolder'
  | 'onToggleFolderLock'
  | 'onDeleteFile'
  | 'onDeleteAsset'
  | 'onToggleFileLock'
  | 'onEditFile'
  | 'onCreateDocumentFromSearch'
  | 'onOpenFileFromSearch'
  | 'onEditFileFromSearch'
  | 'onUpdateSelectedAsset'
  | 'onGraphChange'
  | 'onRelationGraphChange'
  | 'onLinkRelatedFiles'
  | 'onUnlinkRelatedFile'
  | 'onUpdateActiveCase'
  | 'onUpdateActiveCaseDraft'
  | 'onSaveActiveCase'
  | 'onDiscardActiveCaseChanges';

export type CaseResolverPageActionsValue = Pick<CaseResolverPageContextValue, CaseResolverPageActionKey>;
export type CaseResolverPageStateValue = Omit<CaseResolverPageContextValue, CaseResolverPageActionKey>;

const CaseResolverPageStateContext = React.createContext<CaseResolverPageStateValue | null>(null);
const CaseResolverPageActionsContext = React.createContext<CaseResolverPageActionsValue | null>(null);

type CaseResolverPageProviderProps = {
  value: CaseResolverPageContextValue;
  children: React.ReactNode;
};

export function CaseResolverPageProvider({
  value,
  children,
}: CaseResolverPageProviderProps): React.JSX.Element {
  const stateValue = React.useMemo<CaseResolverPageStateValue>(
    () => ({
      workspace: value.workspace,
      activeCaseId: value.activeCaseId,
      requestedCaseStatus: value.requestedCaseStatus,
      requestedCaseIssue: value.requestedCaseIssue,
      canCreateInActiveCase: value.canCreateInActiveCase,
      selectedFileId: value.selectedFileId,
      selectedAssetId: value.selectedAssetId,
      selectedFolderPath: value.selectedFolderPath,
      panelCollapsed: value.panelCollapsed,
      caseResolverTags: value.caseResolverTags,
      caseResolverIdentifiers: value.caseResolverIdentifiers,
      caseResolverCategories: value.caseResolverCategories,
      activeFile: value.activeFile,
      selectedAsset: value.selectedAsset,
      activeCaseFile: value.activeCaseFile,
      activeCaseMetadataDraft: value.activeCaseMetadataDraft,
      isActiveCaseMetadataDirty: value.isActiveCaseMetadataDirty,
      caseTagOptions: value.caseTagOptions,
      caseIdentifierOptions: value.caseIdentifierOptions,
      caseCategoryOptions: value.caseCategoryOptions,
      caseReferenceOptions: value.caseReferenceOptions,
      parentCaseOptions: value.parentCaseOptions,
      partyOptions: value.partyOptions,
    }),
    [value]
  );

  const actionsValue = React.useMemo<CaseResolverPageActionsValue>(
    () => ({
      onRetryCaseContext: value.onRetryCaseContext,
      onResetCaseContext: value.onResetCaseContext,
      onPanelCollapsedChange: value.onPanelCollapsedChange,
      onDeactivateActiveFile: value.onDeactivateActiveFile,
      onSelectFile: value.onSelectFile,
      onSelectAsset: value.onSelectAsset,
      onSelectFolder: value.onSelectFolder,
      onCreateFolder: value.onCreateFolder,
      onCreateFile: value.onCreateFile,
      onCreateScanFile: value.onCreateScanFile,
      onCreateNodeFile: value.onCreateNodeFile,
      onCreateImageAsset: value.onCreateImageAsset,
      onUploadScanFiles: value.onUploadScanFiles,
      onRunScanFileOcr: value.onRunScanFileOcr,
      onUploadAssets: value.onUploadAssets,
      onAttachAssetFile: value.onAttachAssetFile,
      onMoveFile: value.onMoveFile,
      onMoveAsset: value.onMoveAsset,
      onMoveFolder: value.onMoveFolder,
      onRenameFile: value.onRenameFile,
      onRenameAsset: value.onRenameAsset,
      onRenameFolder: value.onRenameFolder,
      onDeleteFolder: value.onDeleteFolder,
      onToggleFolderLock: value.onToggleFolderLock,
      onDeleteFile: value.onDeleteFile,
      onDeleteAsset: value.onDeleteAsset,
      onToggleFileLock: value.onToggleFileLock,
      onEditFile: value.onEditFile,
      onCreateDocumentFromSearch: value.onCreateDocumentFromSearch,
      onOpenFileFromSearch: value.onOpenFileFromSearch,
      onEditFileFromSearch: value.onEditFileFromSearch,
      onUpdateSelectedAsset: value.onUpdateSelectedAsset,
      onGraphChange: value.onGraphChange,
      onRelationGraphChange: value.onRelationGraphChange,
      onLinkRelatedFiles: value.onLinkRelatedFiles,
      onUnlinkRelatedFile: value.onUnlinkRelatedFile,
      onUpdateActiveCase: value.onUpdateActiveCase,
      onUpdateActiveCaseDraft: value.onUpdateActiveCaseDraft,
      onSaveActiveCase: value.onSaveActiveCase,
      onDiscardActiveCaseChanges: value.onDiscardActiveCaseChanges,
    }),
    [value]
  );

  return (
    <CaseResolverPageStateContext.Provider value={stateValue}>
      <CaseResolverPageActionsContext.Provider value={actionsValue}>
        {children}
      </CaseResolverPageActionsContext.Provider>
    </CaseResolverPageStateContext.Provider>
  );
}

export function useCaseResolverPageState(): CaseResolverPageStateValue {
  const context = React.useContext(CaseResolverPageStateContext);
  if (!context) {
    throw new Error('useCaseResolverPageState must be used within CaseResolverPageProvider');
  }
  return context;
}

export function useCaseResolverPageActions(): CaseResolverPageActionsValue {
  const context = React.useContext(CaseResolverPageActionsContext);
  if (!context) {
    throw new Error('useCaseResolverPageActions must be used within CaseResolverPageProvider');
  }
  return context;
}
