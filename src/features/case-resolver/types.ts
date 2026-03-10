import type { CaseResolverCaptureProposalState } from '@/features/case-resolver-capture';
import type {
  CaseResolverFile,
  CaseResolverAssetFile,
  CaseResolverGraph,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverFileType,
  CaseResolverPartyReference,
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverScanSlot,
  CaseResolverDocumentDateProposal,
  CaseResolverWorkspace,
  CaseResolverEditorNodeContext,
  CaseResolverSettings,
  CaseResolverAssetKind,
  CaseResolverFileEditDraft,
  CaseResolverCompiledSegment,
  CaseResolverCompileResult,
  CaseResolverDocumentVersion,
  CaseResolverWorkspaceNormalizationDiagnostics,
  CaseResolverEditorMode,
  CaseResolverRequestedCaseStatus,
  CaseResolverRequestedCaseIssue,
  WorkspaceView,
  EditorDetailsTab,
} from '@/shared/contracts/case-resolver';

export type {
  CaseResolverFile,
  CaseResolverAssetFile,
  CaseResolverGraph,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverFileType,
  CaseResolverPartyReference,
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverScanSlot,
  CaseResolverDocumentDateProposal,
  CaseResolverWorkspace,
  CaseResolverEditorNodeContext,
  CaseResolverSettings,
  CaseResolverAssetKind,
  CaseResolverFileEditDraft,
  CaseResolverCompiledSegment,
  CaseResolverCompileResult,
  CaseResolverDocumentVersion,
  CaseResolverWorkspaceNormalizationDiagnostics,
  CaseResolverEditorMode,
  CaseResolverRequestedCaseStatus,
  CaseResolverRequestedCaseIssue,
  WorkspaceView,
  EditorDetailsTab,
};

import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import type { CountryOption } from '@/shared/contracts/internationalization';

import type {
  CaseResolverPromptExploderApplyUiDiagnostics,
  CaseResolverPromptExploderPendingPayload,
} from './hooks/useCaseResolverState.prompt-exploder-sync';
import type { CaseResolverRuntimeIndexes } from './runtime/selectors/indexes';

export type CaseResolverStateValue = {
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  workspaceIndexes: CaseResolverRuntimeIndexes;
  workspaceNormalizationDiagnostics: CaseResolverWorkspaceNormalizationDiagnostics;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  folderPanelCollapsed: boolean;
  setFolderPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activeMainView: 'workspace' | 'search';
  setActiveMainView: React.Dispatch<React.SetStateAction<'workspace' | 'search'>>;
  isPreviewPageVisible: boolean;
  setIsPreviewPageVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isPartiesModalOpen: boolean;
  setIsPartiesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  editingDocumentNodeContext: CaseResolverEditorNodeContext | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setEditingDocumentNodeContext: React.Dispatch<
    React.SetStateAction<CaseResolverEditorNodeContext | null>
  >;
  isUploadingScanDraftFiles: boolean;
  setIsUploadingScanDraftFiles: React.Dispatch<React.SetStateAction<boolean>>;
  uploadingScanSlotId: string | null;
  setUploadingScanSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  caseResolverSettings: CaseResolverSettings;
  countries: CountryOption[];
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (collapsed: boolean) => void;
  requestedFileId: string | null;
  requestedPromptExploderSessionId: string;
  activeCaseId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  requestedCaseIssue: CaseResolverRequestedCaseIssue | null;
  requestedContextAutoClearRequestKey: string | null;
  canCreateInActiveCase: boolean;
  shouldOpenEditorFromQuery: boolean;
  handleAcknowledgeRequestedContextAutoClear: (requestKey: string | null) => void;
  handleRetryCaseContext: () => void;
  handleResetCaseContext: () => void;
  handleSelectFile: (fileId: string) => void;
  handleSelectAsset: (assetId: string) => void;
  handleSelectFolder: (folderPath: string | null) => void;
  handleCreateFolder: (targetFolderPath: string | null) => void;
  handleCreateFile: (targetFolderPath: string | null) => void;
  handleCreateScanFile: (targetFolderPath: string | null) => void;
  handleCreateNodeFile: (targetFolderPath: string | null) => void;
  handleCreateImageAsset: (targetFolderPath: string | null) => void;
  handleCreateDocumentFromText: (scanFileId: string) => void;
  handleUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  handleRunScanFileOcr: (fileId: string) => Promise<void>;
  handleUploadAssets: (
    files: File[],
    targetFolderPath: string | null
  ) => Promise<CaseResolverAssetFile[]>;
  handleAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
  handleDeleteFolder: (folderPath: string) => void;
  handleMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  handleMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  handleRenameFile: (fileId: string, nextName: string) => Promise<void>;
  handleRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  handleOpenFileEditor: (
    fileId: string,
    options?: { nodeContext?: CaseResolverEditorNodeContext | null }
  ) => void;
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  handleUpdateSelectedAsset: (
    patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description' | 'metadata'>>,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      source?: string;
    }
  ) => void;
  handleUpdateActiveFileParties: (
    patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>
  ) => void;
  handleLinkRelatedFiles: (fileIdA: string, fileIdB: string) => void;
  handleUnlinkRelatedFile: (sourceFileId: string, targetFileId: string) => void;
  handleSaveFileEditor: () => void;
  handleDiscardFileEditorDraft: () => void;
  pendingPromptExploderPayload: CaseResolverPromptExploderPendingPayload | null;
  refreshPendingPromptExploderPayload: () => void;
  handleApplyPendingPromptExploderPayload: () => Promise<boolean>;
  handleDiscardPendingPromptExploderPayload: () => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: React.Dispatch<
    React.SetStateAction<CaseResolverCaptureProposalState | null>
  >;
  promptExploderApplyDiagnostics: CaseResolverPromptExploderApplyUiDiagnostics | null;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isApplyingPromptExploderPartyProposal: boolean;
  setIsApplyingPromptExploderPartyProposal: (
    value: boolean | ((current: boolean) => boolean)
  ) => void;
  refetchSettingsStore: () => void;
  confirmAction: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }) => void;
  ConfirmationModal: React.ComponentType;
  PromptInputModal: React.ComponentType;
  filemakerDatabase: FilemakerDatabase;
};
