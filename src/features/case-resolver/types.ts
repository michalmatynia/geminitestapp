import type { CaseResolverCaptureProposalState } from '@/features/case-resolver-capture/proposals';
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
  CaseResolverSettingsDto,
  CaseResolverAssetKind,
  CaseResolverDocumentHistoryEntry,
} from '@/shared/contracts/case-resolver';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import type { CountryOption } from '@/shared/contracts/internationalization';

import type {
  CaseResolverPromptExploderApplyUiDiagnostics,
  CaseResolverPromptExploderPendingPayload,
} from './hooks/useCaseResolverState.prompt-exploder-sync';

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
};

export type CaseResolverDocumentVersion = 'original' | 'exploded';

export interface CaseResolverCompiledSegment {
  id: string;
  nodeId: string | null;
  role: string;
  content: string;
  title?: string;
  text?: string;
  includeInOutput?: boolean;
  sourceFileId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CaseResolverCompileResult {
  segments: CaseResolverCompiledSegment[];
  combinedContent: string;
  prompt: string;
  outputsByNode: Record<string, { textfield: string; content: string; plainText: string }>;
  warnings: string[];
}

export type CaseResolverEditorMode = 'wysiwyg' | 'markdown' | 'code';

export interface CaseResolverFileEditDraft {
  id: string;
  name: string;
  content: string;
  fileType: CaseResolverFileType;
  folder: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  documentDate?: CaseResolverDocumentDateProposal | null | undefined;
  documentCity?: string | null | undefined;
  originalDocumentContent?: string | undefined;
  explodedDocumentContent?: string | undefined;
  activeDocumentVersion?: CaseResolverDocumentVersion | undefined;
  editorType?: CaseResolverEditorMode | undefined;
  documentContentFormatVersion?: number | undefined;
  documentContentVersion?: number | undefined;
  baseDocumentContentVersion?: number | null | undefined;
  documentContent?: string | undefined;
  documentContentMarkdown?: string | undefined;
  documentContentHtml?: string | undefined;
  documentContentPlainText?: string | undefined;
  documentHistory: CaseResolverDocumentHistoryEntry[];
  documentConversionWarnings?: string[] | undefined;
  lastContentConversionAt?: string | null | undefined;
  scanSlots: CaseResolverScanSlot[];
  scanOcrModel?: string | undefined;
  scanOcrPrompt?: string | undefined;
  isLocked?: boolean | undefined;
  graph?: CaseResolverGraph | undefined;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  categoryId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
}

export type CaseResolverRequestedCaseStatus = 'loading' | 'ready' | 'missing';

export type CaseResolverStateValue = {
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
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
  setEditingDocumentNodeContext: React.Dispatch<React.SetStateAction<CaseResolverEditorNodeContext | null>>;
  isUploadingScanDraftFiles: boolean;
  setIsUploadingScanDraftFiles: React.Dispatch<React.SetStateAction<boolean>>;
  uploadingScanSlotId: string | null;
  setUploadingScanSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  caseResolverSettings: CaseResolverSettingsDto;
  countries: CountryOption[];
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (collapsed: boolean) => void;
  requestedFileId: string | null;
  requestedPromptExploderSessionId: string;
  activeCaseId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  canCreateInActiveCase: boolean;
  shouldOpenEditorFromQuery: boolean;
  handleSelectFile: (fileId: string, options?: { preserveSelectedAsset?: boolean }) => void;
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
  handleUploadAssets: (files: File[], targetFolderPath: string | null) => Promise<CaseResolverAssetFile[]>;
  handleAttachAssetFile: (assetId: string, file: File, options?: { expectedKind?: CaseResolverAssetKind | null }) => Promise<CaseResolverAssetFile>;
  handleDeleteFolder: (folderPath: string) => void;
  handleMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  handleMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  handleRenameFile: (fileId: string, nextName: string) => Promise<void>;
  handleRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  handleOpenFileEditor: (fileId: string, options?: { nodeContext?: CaseResolverEditorNodeContext | null }) => void;
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  handleUpdateSelectedAsset: (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>) => void;
  handleUpdateActiveFileParties: (patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>) => void;
  handleLinkRelatedFiles: (fileIdA: string, fileIdB: string) => void;
  handleUnlinkRelatedFile: (sourceFileId: string, targetFileId: string) => void;
  handleSaveFileEditor: () => void;
  handleDiscardFileEditorDraft: () => void;
  pendingPromptExploderPayload: CaseResolverPromptExploderPendingPayload | null;
  refreshPendingPromptExploderPayload: () => void;
  handleApplyPendingPromptExploderPayload: () => Promise<boolean>;
  handleDiscardPendingPromptExploderPayload: () => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: React.Dispatch<React.SetStateAction<CaseResolverCaptureProposalState | null>>;
  promptExploderApplyDiagnostics: CaseResolverPromptExploderApplyUiDiagnostics | null;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isApplyingPromptExploderPartyProposal: boolean;
  setIsApplyingPromptExploderPartyProposal: (value: boolean | ((current: boolean) => boolean)) => void;
  refetchSettingsStore: () => void;
  confirmAction: (options: { title: string; message: string; confirmText?: string; cancelText?: string; isDangerous?: boolean; onConfirm?: () => void | Promise<void>; onCancel?: () => void }) => void;
  ConfirmationModal: React.ComponentType;
  PromptInputModal: React.ComponentType;
  filemakerDatabase: FilemakerDatabase;
};
