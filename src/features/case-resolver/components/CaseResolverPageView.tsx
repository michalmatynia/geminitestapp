 
import { Copy, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import type {
  CaseResolverCaptureDocumentDateAction,
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import { type CaseResolverCaptureAction } from '@/features/case-resolver-capture/settings';
import { DocumentWysiwygEditor } from '@/features/document-editor';
import {
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
} from '@/features/filemaker/settings';
import {
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverFileEditDraft,
  type CaseResolverFile,
  type CaseResolverAssetFile,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverRelationGraph,
} from '@/shared/contracts/case-resolver';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  FormField,
  MultiSelect,
  SearchInput,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  EmptyState,
  FileUploadTrigger,
  Card,
} from '@/shared/ui';
import { DRAG_KEYS } from '@/shared/utils/drag-drop';

import { buildMissingSelectedPartyOption } from './case-resolver-party-select';
import { CaseResolverCanvasWorkspace } from './CaseResolverCanvasWorkspace';
import { CaseResolverCaseOverviewWorkspace } from './CaseResolverCaseOverviewWorkspace';
import { CaseResolverFileViewer } from './CaseResolverFileViewer';
import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import { CaseResolverNodeFileWorkspace } from './CaseResolverNodeFileWorkspace';
import { CaseResolverRelationsWorkspace } from './CaseResolverRelationsWorkspace';
import { PromptExploderCaptureMappingModal } from './PromptExploderCaptureMappingModal';
import { CaseResolverPageProvider } from '../context/CaseResolverPageContext';
import { emitCaseResolverShowDocumentInCanvas } from '../drag';
import { resolvePromptExploderTransferStatusLabel } from '../hooks/prompt-exploder-transfer-lifecycle';
import { buildCaseResolverNodeFileRelationIndexFromAssets } from '../nodefile-relations';
import { resolveCaseResolverOcrProviderLabel } from '../ocr-provider';
import { type CaseResolverStateValue } from '../types';

const ENABLE_CASE_RESOLVER_TRANSFER_DIAGNOSTICS =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_TRANSFER_DIAGNOSTICS'] === '1';

type SelectOption = {
  value: string;
  label: string;
  description?: string | undefined;
};

type WorkspaceView = 'document' | 'relations';
type EditorDetailsTab = 'document' | 'relations' | 'metadata' | 'revisions';
type PartySearchKind = 'person' | 'organization';

const CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS: Array<{
  value: PartySearchKind;
  label: string;
  description: string;
}> = [
  {
    value: 'person',
    label: 'Persons',
    description: 'Search within persons',
  },
  {
    value: 'organization',
    label: 'Organizations',
    description: 'Search within organizations',
  },
];

type CaseResolverPageViewProps = {
  state: CaseResolverStateValue;
  workspaceView: WorkspaceView;
  setWorkspaceView: React.Dispatch<React.SetStateAction<WorkspaceView>>;
  handleMoveFolder: (fromPath: string, toPath: string) => Promise<void>;
  handleToggleFolderLock: (folderPath: string) => void;
  handleToggleFileLock: (fileId: string) => void;
  handleDeleteFile: (fileId: string) => void;
  handleDeleteAsset: (assetId: string) => void;
  handleGraphChange: (nextGraph: CaseResolverGraph) => void;
  handleRelationGraphChange: (nextGraph: CaseResolverRelationGraph) => void;
  editorDetailsTab: EditorDetailsTab;
  setEditorDetailsTab: React.Dispatch<React.SetStateAction<EditorDetailsTab>>;
  isScanDraftDropActive: boolean;
  scanDraftUploadInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleScanDraftDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftUploadInputChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleTriggerScanDraftUpload: () => void;
  handleDeleteScanDraftSlot: (slotId: string) => void;
  handleRunScanDraftOcr: () => void;
  updateEditingDocumentDraft: (
    patch: Partial<CaseResolverFileEditDraft>,
  ) => void;
  editingDocumentNodeMeta:
    | (CaseResolverNodeMeta & {
        nodeId: string;
        nodeTitle: string;
        canvasFileId: string;
        canvasFileName: string;
      })
    | null;
  updateEditingDocumentNodeMeta: (patch: Partial<CaseResolverNodeMeta>) => void;
  caseTagOptions: SelectOption[];
  caseIdentifierOptions: SelectOption[];
  caseCategoryOptions: SelectOption[];
  caseReferenceOptions: SelectOption[];
  parentCaseOptions: SelectOption[];
  partyOptions: SelectOption[];
  handleUseHistoryEntry: (entry: CaseResolverDocumentHistoryEntry) => void;
  isEditorDraftDirty: boolean;
  handleOpenPromptExploderForDraft: () => void;
  editorContentRevisionSeed: number;
  handleUpdateDraftDocumentContent: (next: string) => void;
  editorTextareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  editorSplitRef: React.MutableRefObject<HTMLDivElement | null>;
  editorWidth: number | null;
  setEditorWidth: React.Dispatch<React.SetStateAction<number | null>>;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: React.Dispatch<React.SetStateAction<boolean>>;
  handleCopyDraftFileId: () => Promise<void>;
  handlePreviewDraftPdf: () => void;
  handlePrintDraftDocument: () => void;
  handleExportDraftPdf: () => Promise<void>;
  promptExploderProposalDraft: CaseResolverCaptureProposalState | null;
  captureProposalTargetFileName: string | null;
  handleClosePromptExploderProposalModal: () => void;
  handleApplyPromptExploderProposal: () => void;
  updatePromptExploderProposalAction: (
    role: 'addresser' | 'addressee',
    action: CaseResolverCaptureAction,
  ) => void;
  updatePromptExploderProposalReference: (
    role: 'addresser' | 'addressee',
    value: string,
  ) => void;
  updatePromptExploderProposalDateAction: (
    action: CaseResolverCaptureDocumentDateAction,
  ) => void;
  resolvePromptExploderMatchedPartyLabel: (
    reference: CaseResolverCaptureProposalState['addresser'] extends infer T
      ? T extends { existingReference?: infer R | null }
        ? R | null | undefined
        : null | undefined
      : null | undefined,
  ) => string;
  captureApplyDiagnostics: {
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
    cleanupDurationMs?: number | null;
    mutationDurationMs?: number | null;
    totalDurationMs?: number | null;
  } | null;
};

const formatHistoryTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
};

const CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function CaseResolverPageView(
  props: CaseResolverPageViewProps,
): React.JSX.Element {
  const router = useRouter();
  const [addresserPartySearchKind, setAddresserPartySearchKind] =
    React.useState<PartySearchKind>('person');
  const [addresseePartySearchKind, setAddresseePartySearchKind] =
    React.useState<PartySearchKind>('organization');
  const [addresserPartyQuery, setAddresserPartyQuery] = React.useState('');
  const [addresseePartyQuery, setAddresseePartyQuery] = React.useState('');
  const [selectedRelatedFileId, setSelectedRelatedFileId] = React.useState<string | null>(null);
  const [isRelationsDropActive, setIsRelationsDropActive] = React.useState(false);
  const [relateSearchQuery, setRelateSearchQuery] = React.useState('');
  const {
    state,
    workspaceView,
    setWorkspaceView,
    handleMoveFolder,
    handleToggleFolderLock,
    handleToggleFileLock,
    handleDeleteFile,
    handleDeleteAsset,
    handleGraphChange,
    handleRelationGraphChange,
    editorDetailsTab,
    setEditorDetailsTab,
    isScanDraftDropActive,
    handleDeleteScanDraftSlot,
    handleRunScanDraftOcr,
    updateEditingDocumentDraft,
    editingDocumentNodeMeta,
    updateEditingDocumentNodeMeta,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    handleUseHistoryEntry,
    isEditorDraftDirty,
    handleOpenPromptExploderForDraft,
    editorContentRevisionSeed,
    handleUpdateDraftDocumentContent,
    handleCopyDraftFileId,
    handlePreviewDraftPdf,
    handlePrintDraftDocument,
    handleExportDraftPdf,
    promptExploderProposalDraft,
    captureProposalTargetFileName,
    handleClosePromptExploderProposalModal,
    handleApplyPromptExploderProposal,
    updatePromptExploderProposalAction,
    updatePromptExploderProposalReference,
    updatePromptExploderProposalDateAction,
    resolvePromptExploderMatchedPartyLabel,
    captureApplyDiagnostics,
  } = props;

  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    requestedFileId,
    requestedPromptExploderSessionId,
    shouldOpenEditorFromQuery,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    setActiveMainView,
    editingDocumentDraft,
    isUploadingScanDraftFiles,
    uploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverSettings,
    updateWorkspace,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateNodeFile,
    handleCreateImageAsset,
    handleCreateDocumentFromText,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    setWorkspace,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    handleUpdateSelectedAsset,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    pendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
    promptExploderPartyProposal,
    promptExploderApplyDiagnostics,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    confirmAction,
    ConfirmationModal,
    PromptInputModal,
    filemakerDatabase,
  } = state;
  React.useEffect(() => {
    const fallbackAddresserKind =
      caseResolverSettings.defaultAddresserPartyKind === 'organization'
        ? 'organization'
        : 'person';
    const fallbackAddresseeKind =
      caseResolverSettings.defaultAddresseePartyKind === 'person'
        ? 'person'
        : 'organization';
    const resolvedAddresserKind =
      editingDocumentDraft?.addresser?.kind ?? fallbackAddresserKind;
    const resolvedAddresseeKind =
      editingDocumentDraft?.addressee?.kind ?? fallbackAddresseeKind;

    setAddresserPartySearchKind(
      resolvedAddresserKind === 'organization' ? 'organization' : 'person',
    );
    setAddresseePartySearchKind(
      resolvedAddresseeKind === 'person' ? 'person' : 'organization',
    );
    setAddresserPartyQuery('');
    setAddresseePartyQuery('');
  }, [
    caseResolverSettings.defaultAddresseePartyKind,
    caseResolverSettings.defaultAddresserPartyKind,
    editingDocumentDraft?.addressee?.kind,
    editingDocumentDraft?.addresser?.kind,
    editingDocumentDraft?.id,
  ]);

  const filterPartyOptions = useCallback(
    (
      kind: PartySearchKind,
      query: string,
      selectedReference: ReturnType<typeof decodeFilemakerPartyReference>,
    ): SelectOption[] => {
      const normalizedQuery = query.trim().toLowerCase();
      const selectedValue = encodeFilemakerPartyReference(selectedReference);

      const filtered = partyOptions.filter((option): boolean => {
        if (option.value === 'none') {
          if (!normalizedQuery) return true;
          return 'none'.includes(normalizedQuery);
        }
        const optionReference = decodeFilemakerPartyReference(option.value, filemakerDatabase);
        if (!optionReference) return false;
        const isSelected = option.value === selectedValue;
        if (optionReference.kind !== kind && !isSelected) return false;
        if (!normalizedQuery) return true;
        const searchSource =
          `${option.label} ${option.description ?? ''}`.toLowerCase();
        return searchSource.includes(normalizedQuery);
      });

      if (
        selectedValue &&
        selectedValue !== 'none' &&
        !filtered.some((option) => option.value === selectedValue)
      ) {
        const selectedOption = partyOptions.find(
          (option) => option.value === selectedValue,
        );
        if (selectedOption) {
          return [selectedOption, ...filtered];
        }
        const missingSelectedOption = buildMissingSelectedPartyOption(selectedReference);
        if (missingSelectedOption) {
          return [missingSelectedOption, ...filtered];
        }
      }
      return filtered;
    },
    [partyOptions],
  );
  const canApplyPendingPromptOutput = Boolean(pendingPromptExploderPayload);
  const hasExpiredPromptTransfer =
    !pendingPromptExploderPayload &&
    promptExploderApplyDiagnostics?.status === 'expired';
  const pendingPromptTransferId =
    pendingPromptExploderPayload?.transferId?.trim() ??
    promptExploderApplyDiagnostics?.transferId?.trim() ??
    '';
  const promptTransferStatus =
    promptExploderApplyDiagnostics?.status ??
    (pendingPromptExploderPayload ? 'pending' : 'idle');
  const promptTransferStatusLabel =
    resolvePromptExploderTransferStatusLabel(promptTransferStatus);
  const pendingPromptTransferCreatedAt =
    pendingPromptExploderPayload?.createdAt ??
    promptExploderApplyDiagnostics?.payloadCreatedAt ??
    null;
  const pendingPromptExploderContextFileId =
    pendingPromptExploderPayload?.caseResolverContext?.fileId?.trim() ??
    promptExploderApplyDiagnostics?.requestedTargetFileId?.trim() ??
    '';
  const pendingPromptExploderSessionId =
    pendingPromptExploderPayload?.caseResolverContext?.sessionId?.trim() ?? '';
  const requestedContextFileId = requestedFileId?.trim() ?? '';
  const requestedSessionId = requestedPromptExploderSessionId?.trim() ?? '';
  const hasPendingPromptExploderDocumentMismatch = Boolean(
    pendingPromptExploderPayload &&
    shouldOpenEditorFromQuery &&
    requestedContextFileId.length > 0 &&
    pendingPromptExploderContextFileId.length > 0 &&
    requestedContextFileId !== pendingPromptExploderContextFileId,
  );
  const hasPendingPromptExploderSessionMismatch = Boolean(
    pendingPromptExploderPayload &&
    requestedSessionId.length > 0 &&
    pendingPromptExploderSessionId !== requestedSessionId,
  );
  const promptExploderMismatchReason = hasPendingPromptExploderDocumentMismatch
    ? 'document'
    : hasPendingPromptExploderSessionMismatch
      ? 'session'
      : null;
  const hasBlockingPendingPromptExploderMismatch =
    promptExploderMismatchReason !== null;
  const pendingPromptExploderTargetFile =
    React.useMemo((): CaseResolverFile | null => {
      if (!pendingPromptExploderContextFileId) return null;
      return (
        workspace.files.find(
          (file: CaseResolverFile): boolean =>
            file.id.trim() === pendingPromptExploderContextFileId,
        ) ?? null
      );
    }, [pendingPromptExploderContextFileId, workspace.files]);
  const pendingPromptExploderTargetFileLabel =
    pendingPromptExploderTargetFile?.name ??
    pendingPromptExploderPayload?.caseResolverContext?.fileName ??
    promptExploderApplyDiagnostics?.requestedTargetFileId ??
    (pendingPromptExploderContextFileId || null);
  const currentPromptExploderBindingFileLabel = React.useMemo(():
    | string
    | null => {
    if (requestedContextFileId.length > 0) {
      const requestedFile = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id.trim() === requestedContextFileId,
      );
      return requestedFile?.name ?? requestedContextFileId;
    }
    return editingDocumentDraft?.name ?? null;
  }, [editingDocumentDraft?.name, requestedContextFileId, workspace.files]);
  const handleOpenPromptExploderTargetDocument = useCallback((): void => {
    if (!pendingPromptExploderContextFileId) return;
    const params = new URLSearchParams();
    params.set('openEditor', '1');
    params.set('fileId', pendingPromptExploderContextFileId);
    if (pendingPromptExploderSessionId.length > 0) {
      params.set('promptExploderSessionId', pendingPromptExploderSessionId);
    }
    router.push(`/admin/case-resolver?${params.toString()}`);
  }, [
    pendingPromptExploderContextFileId,
    pendingPromptExploderSessionId,
    router,
  ]);
  const showPromptExploderManualRetry = Boolean(
    pendingPromptExploderPayload &&
    promptExploderApplyDiagnostics?.status === 'failed',
  );
  const showPromptExploderTransferCard = Boolean(
    pendingPromptExploderPayload || hasExpiredPromptTransfer,
  );
  const showPromptExploderApplyAction = Boolean(pendingPromptExploderPayload);
  const showPromptExploderDiscardAction =
    Boolean(pendingPromptExploderPayload || hasExpiredPromptTransfer) &&
    !hasBlockingPendingPromptExploderMismatch;

  const addresserPartyOptions = React.useMemo(
    () =>
      filterPartyOptions(
        addresserPartySearchKind,
        addresserPartyQuery,
        editingDocumentDraft?.addresser ?? null,
      ),
    [
      addresserPartyQuery,
      addresserPartySearchKind,
      editingDocumentDraft?.addresser,
      filterPartyOptions,
    ],
  );
  const addresseePartyOptions = React.useMemo(
    () =>
      filterPartyOptions(
        addresseePartySearchKind,
        addresseePartyQuery,
        editingDocumentDraft?.addressee ?? null,
      ),
    [
      addresseePartyQuery,
      addresseePartySearchKind,
      editingDocumentDraft?.addressee,
      filterPartyOptions,
    ],
  );

  const configuredScanOcrModel = caseResolverSettings.ocrModel.trim();
  const scanOcrProviderLabel = React.useMemo((): string => {
    if (!configuredScanOcrModel) return 'Not set';
    return resolveCaseResolverOcrProviderLabel(configuredScanOcrModel);
  }, [configuredScanOcrModel]);
  const activeCaseFile = React.useMemo((): CaseResolverFile | null => {
    if (activeCaseId) {
      const activeCase = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === activeCaseId && file.fileType === 'case',
      );
      if (activeCase) return activeCase;
    }
    if (activeFile?.fileType === 'case') return activeFile;
    if (activeFile?.parentCaseId) {
      const parentCase = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === activeFile.parentCaseId && file.fileType === 'case',
      );
      if (parentCase) return parentCase;
    }
    return null;
  }, [activeCaseId, activeFile, workspace.files]);
  const relatedFiles = React.useMemo((): CaseResolverFile[] => {
    if (!editingDocumentDraft) return [];
    const liveFile = workspace.files.find(
      (f: CaseResolverFile) => f.id === editingDocumentDraft.id,
    );
    if (!liveFile?.relatedFileIds?.length) return [];
    const ids = new Set(liveFile.relatedFileIds);
    return workspace.files.filter(
      (f: CaseResolverFile) => ids.has(f.id) && f.id !== editingDocumentDraft.id,
    );
  }, [workspace.files, editingDocumentDraft?.id]);
  const selectedRelatedFile = React.useMemo(
    () => relatedFiles.find((f) => f.id === selectedRelatedFileId) ?? null,
    [relatedFiles, selectedRelatedFileId],
  );
  const relateSearchResults = React.useMemo((): CaseResolverFile[] => {
    const query = relateSearchQuery.trim().toLowerCase();
    if (!query || !editingDocumentDraft) return [];
    const excludeIds = new Set([
      editingDocumentDraft.id,
      ...relatedFiles.map((f) => f.id),
    ]);
    return workspace.files
      .filter(
        (f: CaseResolverFile) =>
          !excludeIds.has(f.id) &&
          f.fileType !== 'case' &&
          (f.name.toLowerCase().includes(query) ||
            (f.folder ?? '').toLowerCase().includes(query)),
      )
      .slice(0, 10);
  }, [relateSearchQuery, workspace.files, editingDocumentDraft, relatedFiles]);
  React.useEffect(() => {
    setSelectedRelatedFileId(null);
    setRelateSearchQuery('');
  }, [editingDocumentDraft?.id]);
  const hasExplicitTreeSelection = Boolean(
    selectedFileId || selectedAssetId || selectedFolderPath !== null,
  );
  const showCaseOverviewWorkspace =
    workspaceView === 'document' &&
    (!hasExplicitTreeSelection || activeFile?.fileType === 'case');
  const connectedNodeCanvasLinks = React.useMemo((): Array<{
    assetId: string;
    label: string;
  }> => {
    if (!editingDocumentDraft || editingDocumentDraft.fileType === 'case') {
      return [];
    }
    const relationIndex = buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: workspace.assets,
      files: workspace.files,
    });
    const linkedAssetIds =
      relationIndex.nodeFileAssetIdsByDocumentFileId[editingDocumentDraft.id] ??
      [];
    return linkedAssetIds
      .map(
        (assetId: string) =>
          workspace.assets.find((asset: CaseResolverAssetFile) => asset.id === assetId) ?? null,
      )
      .filter(
        (asset): asset is CaseResolverAssetFile =>
          asset !== null && asset.kind === 'node_file',
      )
      .map((asset: CaseResolverAssetFile) => ({
        assetId: asset.id,
        label: asset.folder ? `${asset.name} (${asset.folder})` : asset.name,
      }));
  }, [editingDocumentDraft, workspace.assets]);
  const handleOpenConnectedNodeCanvas = useCallback(
    (assetId: string): void => {
      const draftFileId = editingDocumentDraft?.id ?? null;
      const openLinkedCanvas = (): void => {
        handleDiscardFileEditorDraft();
        setWorkspaceView('document');
        handleSelectAsset(assetId);
        if (!draftFileId) return;
        window.setTimeout((): void => {
          emitCaseResolverShowDocumentInCanvas({
            fileId: draftFileId,
            relatedNodeFileAssetIds: [assetId],
          });
        }, 0);
      };

      if (editingDocumentDraft && isEditorDraftDirty) {
        confirmAction({
          title: 'Unsaved Changes',
          message:
            'You have unsaved changes in this document. Keep editing or discard and open linked canvas?',
          cancelText: 'Keep Editing',
          confirmText: 'Discard + Open Canvas',
          isDangerous: true,
          onConfirm: openLinkedCanvas,
        });
        return;
      }

      openLinkedCanvas();
    },
    [
      confirmAction,
      editingDocumentDraft,
      handleDiscardFileEditorDraft,
      handleSelectAsset,
      isEditorDraftDirty,
      setWorkspaceView,
    ],
  );

  const handleCreateDocumentFromSearch = useCallback((): void => {
    setActiveMainView('workspace');
    handleCreateFile(null);
  }, [handleCreateFile, setActiveMainView]);

  const handleOpenFileFromSearch = useCallback(
    (id: string): void => {
      setActiveMainView('workspace');
      handleSelectFile(id);
    },
    [handleSelectFile, setActiveMainView],
  );

  const handleEditFileFromSearch = useCallback(
    (id: string): void => {
      setActiveMainView('workspace');
      handleOpenFileEditor(id);
    },
    [handleOpenFileEditor, setActiveMainView],
  );
  const handleUpdateActiveCaseMetadata = useCallback(
    (
      patch: Partial<
        Pick<
          CaseResolverFile,
          | 'name'
          | 'parentCaseId'
          | 'referenceCaseIds'
          | 'tagId'
          | 'caseIdentifierId'
          | 'categoryId'
        >
      >,
    ): void => {
      if (!activeCaseFile) return;
      if (activeCaseFile.isLocked) return;

      updateWorkspace(
        (current) => {
          const currentCase = current.files.find(
            (file: CaseResolverFile): boolean =>
              file.id === activeCaseFile.id && file.fileType === 'case',
          );
          if (!currentCase || currentCase.isLocked) return current;

          const hasNamePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'name',
          );
          const hasParentCasePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'parentCaseId',
          );
          const hasReferencePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'referenceCaseIds',
          );
          const hasTagPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'tagId',
          );
          const hasCaseIdentifierPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'caseIdentifierId',
          );
          const hasCategoryPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'categoryId',
          );

          const nextName = hasNamePatch
            ? patch.name?.trim() || currentCase.name || 'Untitled Case'
            : currentCase.name;
          const rawParentCaseId = hasParentCasePatch
            ? (patch.parentCaseId ?? null)
            : currentCase.parentCaseId;
          const nextParentCaseId = rawParentCaseId?.trim()
            ? rawParentCaseId.trim()
            : null;
          const normalizedParentCaseId =
            nextParentCaseId === currentCase.id ? null : nextParentCaseId;
          const nextReferenceCaseIds = hasReferencePatch
            ? Array.from(
              new Set(
                (patch.referenceCaseIds ?? [])
                  .map((value: string): string => value.trim())
                  .filter(
                    (value: string): boolean =>
                      value.length > 0 && value !== currentCase.id,
                  ),
              ),
            )
            : currentCase.referenceCaseIds;
          const nextTagId = hasTagPatch
            ? patch.tagId?.trim() || null
            : currentCase.tagId;
          const nextCaseIdentifierId = hasCaseIdentifierPatch
            ? patch.caseIdentifierId?.trim() || null
            : currentCase.caseIdentifierId;
          const nextCategoryId = hasCategoryPatch
            ? patch.categoryId?.trim() || null
            : currentCase.categoryId;

          if (
            nextName === currentCase.name &&
            normalizedParentCaseId === currentCase.parentCaseId &&
            nextTagId === currentCase.tagId &&
            nextCaseIdentifierId === currentCase.caseIdentifierId &&
            nextCategoryId === currentCase.categoryId &&
            JSON.stringify(nextReferenceCaseIds) ===
              JSON.stringify(currentCase.referenceCaseIds)
          ) {
            return current;
          }

          const now = new Date().toISOString();
          return {
            ...current,
            files: current.files.map(
              (file: CaseResolverFile): CaseResolverFile =>
                file.id === currentCase.id
                  ? {
                    ...file,
                    name: nextName,
                    parentCaseId: normalizedParentCaseId,
                    referenceCaseIds: nextReferenceCaseIds,
                    tagId: nextTagId,
                    caseIdentifierId: nextCaseIdentifierId,
                    categoryId: nextCategoryId,
                    updatedAt: now,
                  }
                  : file,
            ),
          };
        },
        {
          source: 'case_view_case_metadata',
          persistNow: true,
        },
      );
    },
    [activeCaseFile, updateWorkspace],
  );
  const isEditingDocumentLocked = editingDocumentDraft?.isLocked === true;
  const fileEditorTitle =
    editingDocumentDraft?.fileType === 'scanfile'
      ? 'Edit Scan'
      : 'Edit Document';
  const scanfileMarkdownPreview = React.useMemo((): string => {
    if (editingDocumentDraft?.fileType !== 'scanfile') {
      return '';
    }
    const markdown = editingDocumentDraft.documentContentMarkdown ?? '';
    if (markdown.trim().length > 0) return markdown;
    const plainText = editingDocumentDraft.documentContentPlainText ?? '';
    if (plainText.trim().length > 0) return plainText;
    return (editingDocumentDraft.scanSlots ?? [])
      .map((slot) => (slot.ocrText || '').trim())
      .filter((value: string): boolean => value.length > 0)
      .join('\n\n');
  }, [editingDocumentDraft]);
  const hasScanfileMarkdownPreview = scanfileMarkdownPreview.trim().length > 0;
  const clearDocumentSelection = useCallback((): void => {
    setSelectedFileId(null);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
  }, [setSelectedAssetId, setSelectedFileId, setSelectedFolderPath]);
  const handleDeactivateActiveFile = useCallback((): void => {
    const deactivate = (): void => {
      handleDiscardFileEditorDraft();
      clearDocumentSelection();
      setWorkspace((current) => {
        const nextActiveFileId = activeCaseFile?.id ?? null;
        if (current.activeFileId === nextActiveFileId) return current;
        return {
          ...current,
          activeFileId: nextActiveFileId,
        };
      });
      setWorkspaceView('document');
    };

    if (editingDocumentDraft && isEditorDraftDirty) {
      confirmAction({
        title: 'Unsaved Changes',
        message:
          'You have unsaved changes in this document. Keep editing or discard and switch to case options?',
        cancelText: 'Keep Editing',
        confirmText: 'Discard + Switch',
        isDangerous: true,
        onConfirm: deactivate,
      });
      return;
    }

    deactivate();
  }, [
    activeCaseFile?.id,
    clearDocumentSelection,
    confirmAction,
    editingDocumentDraft,
    handleDiscardFileEditorDraft,
    isEditorDraftDirty,
    setWorkspace,
    setWorkspaceView,
  ]);
  const lastInlineEditorAutoOpenFileIdRef = React.useRef<string | null>(null);
  const hasUnsavedChanges = isEditorDraftDirty;
  const confirmLeaveWithUnsavedChanges = useCallback(
    (onConfirm: () => void): void => {
      confirmAction({
        title: 'Unsaved Changes',
        message:
          'You have unsaved document changes. Leave this page without saving?',
        confirmText: 'Leave',
        onConfirm,
      });
    },
    [confirmAction],
  );

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent): void => {
      if (!hasUnsavedChanges) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
        return;
      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) return;
      const anchor = rawTarget.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href')?.trim() ?? '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:'))
        return;
      const current = new URL(window.location.href);
      const next = new URL(anchor.href, current.href);
      if (current.origin !== next.origin) return;
      if (
        current.pathname === next.pathname &&
        current.search === next.search &&
        current.hash === next.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      confirmLeaveWithUnsavedChanges(() => {
        window.location.href = anchor.href;
      });
    };
    document.addEventListener('click', handleDocumentClick, true);
    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [confirmLeaveWithUnsavedChanges, hasUnsavedChanges]);

  React.useEffect(() => {
    const handlePopState = (): void => {
      if (!hasUnsavedChanges) return;
      event?.preventDefault();
      confirmLeaveWithUnsavedChanges(() => {
        window.history.back();
      });
      window.history.go(1);
    };
    window.addEventListener('popstate', handlePopState);
    return (): void => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [confirmLeaveWithUnsavedChanges, hasUnsavedChanges]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isSaveShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 's';
      if (!isSaveShortcut || !editingDocumentDraft) return;
      event.preventDefault();
      handleSaveFileEditor();
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingDocumentDraft, handleSaveFileEditor]);

  React.useEffect(() => {
    if (workspaceView !== 'document') return;
    if (!selectedFileId) {
      lastInlineEditorAutoOpenFileIdRef.current = null;
      return;
    }
    if (editingDocumentDraft?.id === selectedFileId) {
      lastInlineEditorAutoOpenFileIdRef.current = selectedFileId;
      return;
    }
    const selectedFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === selectedFileId,
    );
    if (!selectedFile || selectedFile.fileType === 'case') return;
    if (lastInlineEditorAutoOpenFileIdRef.current === selectedFileId) return;
    lastInlineEditorAutoOpenFileIdRef.current = selectedFileId;
    handleOpenFileEditor(selectedFileId);
  }, [
    editingDocumentDraft?.id,
    handleOpenFileEditor,
    selectedFileId,
    workspace.files,
    workspaceView,
  ]);

  // Main Render
  return (
    <CaseResolverPageProvider
      value={{
        workspace,
        activeCaseId,
        requestedCaseStatus,
        canCreateInActiveCase,
        selectedFileId,
        selectedAssetId,
        selectedFolderPath,
        activeFile,
        selectedAsset,
        panelCollapsed: folderPanelCollapsed,
        onPanelCollapsedChange: setFolderPanelCollapsed,
        onDeactivateActiveFile: handleDeactivateActiveFile,
        onSelectFile: handleSelectFile,
        onSelectAsset: handleSelectAsset,
        onSelectFolder: handleSelectFolder,
        onCreateFile: handleCreateFile,
        onCreateFolder: handleCreateFolder,
        onDeleteFolder: handleDeleteFolder,
        onCreateScanFile: handleCreateScanFile,
        onCreateImageAsset: handleCreateImageAsset,
        onCreateNodeFile: (targetFolderPath) => {
          handleCreateNodeFile(targetFolderPath);
          setWorkspaceView('document');
        },
        onUploadScanFiles: handleUploadScanFiles,
        onRunScanFileOcr: handleRunScanFileOcr,
        onUploadAssets: handleUploadAssets,
        onAttachAssetFile: handleAttachAssetFile,
        onMoveFile: state.handleMoveFile,
        onMoveAsset: state.handleMoveAsset,
        onMoveFolder: handleMoveFolder,
        onRenameFile: state.handleRenameFile,
        onRenameAsset: state.handleRenameAsset,
        onRenameFolder: state.handleRenameFolder,
        onToggleFolderLock: handleToggleFolderLock,
        onDeleteFile: handleDeleteFile,
        onDeleteAsset: handleDeleteAsset,
        onToggleFileLock: handleToggleFileLock,
        onEditFile: handleOpenFileEditor,
        caseResolverTags,
        caseResolverIdentifiers,
        caseResolverCategories,
        onCreateDocumentFromSearch: handleCreateDocumentFromSearch,
        onOpenFileFromSearch: handleOpenFileFromSearch,
        onEditFileFromSearch: handleEditFileFromSearch,
        onUpdateSelectedAsset: handleUpdateSelectedAsset,
        onGraphChange: handleGraphChange,
        onRelationGraphChange: handleRelationGraphChange,
        onLinkRelatedFiles: state.handleLinkRelatedFiles,
        onUnlinkRelatedFile: state.handleUnlinkRelatedFile,
      }}
    >
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}

          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            {selectedAsset?.kind === 'node_file' ? (
              <CaseResolverNodeFileWorkspace />
            ) : workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace
                focusCaseId={activeCaseFile?.id ?? activeCaseId}
              />
            ) : showCaseOverviewWorkspace ? (
              <CaseResolverCaseOverviewWorkspace
                activeCaseFile={activeCaseFile}
                caseTagOptions={caseTagOptions}
                caseIdentifierOptions={caseIdentifierOptions}
                caseCategoryOptions={caseCategoryOptions}
                caseReferenceOptions={caseReferenceOptions}
                parentCaseOptions={parentCaseOptions}
                onUpdateActiveCase={handleUpdateActiveCaseMetadata}
              />
            ) : selectedAsset ? (
              <CaseResolverFileViewer />
            ) : editingDocumentDraft?.fileType === 'scanfile' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-1'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <h2 className='truncate text-2xl font-bold tracking-tight text-white'>
                      {fileEditorTitle}
                    </h2>
                    {isEditingDocumentLocked ? (
                      <Badge
                        variant='outline'
                        className='border-amber-500/50 text-amber-200'
                      >
                        Locked · View only
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    onClick={(): void => {
                      handleCreateDocumentFromText(editingDocumentDraft.id);
                    }}
                    disabled={!hasScanfileMarkdownPreview || isEditingDocumentLocked}
                    className='h-8 min-w-[220px] rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    Create Document from Text
                  </Button>
                </div>

                <FileUploadTrigger
                  accept='image/*,application/pdf,.pdf'
                  onFilesSelected={(files) =>
                    handleUploadScanFiles(editingDocumentDraft.id, files)
                  }
                  disabled={isUploadingScanDraftFiles || isEditingDocumentLocked}
                  multiple
                  asChild
                >
                  <Card
                    variant='subtle'
                    padding='sm'
                    className={`transition ${
                      isScanDraftDropActive
                        ? 'border-cyan-500/70 bg-cyan-500/10'
                        : 'bg-card/30'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-xs font-medium text-gray-200'>
                        Document Slots
                      </div>
                      <div className='ml-auto flex items-center gap-2'>
                        <Button
                          type='button'
                          disabled={
                            isUploadingScanDraftFiles || isEditingDocumentLocked
                          }
                          className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60 disabled:opacity-60'
                        >
                          {isUploadingScanDraftFiles
                            ? 'Uploading...'
                            : 'Upload Files'}
                        </Button>
                        <Button
                          type='button'
                          onClick={(event): void => {
                            event.stopPropagation();
                            handleRunScanDraftOcr();
                          }}
                          disabled={
                            (editingDocumentDraft.scanSlots ?? []).length === 0 ||
                            isUploadingScanDraftFiles ||
                            uploadingScanSlotId !== null ||
                            isEditingDocumentLocked
                          }
                          className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60'
                        >
                          {uploadingScanSlotId !== null
                            ? 'Running OCR...'
                            : 'Run OCR'}
                        </Button>
                      </div>
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
                      <span>
                        OCR model and prompt are controlled in Case Resolver
                        Settings.
                      </span>
                      <Badge
                        variant='outline'
                        className='px-1.5 py-0 text-[9px] uppercase tracking-wide'
                      >
                        {scanOcrProviderLabel}
                      </Badge>
                      <span className='font-mono text-[10px] text-gray-400'>
                        {configuredScanOcrModel || 'No OCR model configured'}
                      </span>
                    </div>
                    <div className='mt-1 text-[11px] text-gray-500'>
                      Drag and drop image or PDF files here, or use Upload Files.
                    </div>
                    <div className='mt-2 max-h-32 space-y-1 overflow-auto pr-1'>
                      {(editingDocumentDraft.scanSlots ?? []).length === 0 ? (
                        <div className='rounded border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-gray-500'>
                          No files uploaded yet.
                        </div>
                      ) : (
                        (editingDocumentDraft.scanSlots ?? []).map((slot) => {
                          const statusLabel =
                            uploadingScanSlotId === 'all' ||
                            uploadingScanSlotId === slot.id
                              ? 'Processing OCR...'
                              : slot.ocrError
                                ? 'OCR failed'
                                : (slot.ocrText || '').trim().length > 0
                                  ? 'OCR extracted'
                                  : 'OCR pending';
                          return (
                            <Card
                              key={slot.id}
                              variant='subtle-compact'
                              padding='none'
                              className='flex items-center justify-between gap-2 bg-card/30 px-2 py-1.5 text-[11px]'
                            >
                              <div className='min-w-0'>
                                <div className='truncate text-gray-200'>
                                  {slot.name || 'Untitled file'}
                                </div>
                                <div className='text-gray-500'>
                                  {statusLabel}
                                </div>
                                {slot.ocrError ? (
                                  <div
                                    className='truncate text-[10px] text-red-300'
                                    title={slot.ocrError}
                                  >
                                    {slot.ocrError}
                                  </div>
                                ) : null}
                              </div>
                              <div className='flex items-center gap-2'>
                                {slot.filepath ? (
                                  <a
                                    href={slot.filepath}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-cyan-200 hover:text-cyan-100'
                                    onClick={(event): void => event.stopPropagation()}
                                  >
                                    Open
                                  </a>
                                ) : null}
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='xs'
                                  disabled={
                                    isUploadingScanDraftFiles ||
                                    uploadingScanSlotId !== null ||
                                    isEditingDocumentLocked
                                  }
                                  className='h-6 px-2 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200'
                                  onClick={(event): void => {
                                    event.stopPropagation();
                                    handleDeleteScanDraftSlot(slot.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </Card>
                </FileUploadTrigger>

                <Card variant='subtle' padding='sm' className='bg-card/30'>
                  <div className='text-xs font-medium text-gray-200'>
                    OCR Text (Markdown)
                  </div>
                  <div className='mt-1 text-[11px] text-gray-500'>
                    Plain markdown output only for scan files.
                  </div>
                  <textarea
                    value={scanfileMarkdownPreview}
                    disabled={isEditingDocumentLocked}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                      handleUpdateDraftDocumentContent(event.currentTarget.value);
                    }}
                    placeholder='Run OCR to populate extracted text.'
                    className='mt-2 min-h-[320px] w-full resize-y rounded-lg border border-border/70 bg-black/20 px-3 py-2 font-mono text-xs text-gray-100'
                  />
                </Card>
              </div>
            ) : editingDocumentDraft ? (
              <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-1'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <h2 className='truncate text-2xl font-bold tracking-tight text-white'>
                        {fileEditorTitle}
                      </h2>
                      {isEditingDocumentLocked ? (
                        <Badge
                          variant='outline'
                          className='border-amber-500/50 text-amber-200'
                        >
                          Locked · View only
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='ml-auto flex flex-wrap items-center justify-end gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      onClick={handleSaveFileEditor}
                      disabled={
                        !isEditorDraftDirty || isEditingDocumentLocked
                      }
                      className={`h-8 min-w-[100px] rounded-md border text-xs transition-colors ${
                        isEditorDraftDirty
                          ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
                          : 'border-border/60 text-gray-500 hover:bg-transparent'
                      }`}
                    >
                      Update
                    </Button>
                    <Button
                      type='button'
                      onClick={handlePreviewDraftPdf}
                      variant='outline'
                      className='min-w-[110px]'
                    >
                      Preview PDF
                    </Button>
                    <Button
                      type='button'
                      onClick={handlePrintDraftDocument}
                      variant='outline'
                      className='min-w-[84px]'
                    >
                      Print
                    </Button>
                    <Button
                      type='button'
                      onClick={(): void => {
                        void handleExportDraftPdf();
                      }}
                      variant='outline'
                      className='min-w-[98px]'
                    >
                      Export PDF
                    </Button>
                  </div>
                </div>
                <div className='space-y-4'>
                  {(editingDocumentDraft.fileType as unknown) === 'scanfile' ? (
                    <FileUploadTrigger
                      accept='image/*,application/pdf,.pdf'
                      onFilesSelected={(files) =>
                        handleUploadScanFiles(editingDocumentDraft.id, files)
                      }
                      disabled={
                        isUploadingScanDraftFiles || isEditingDocumentLocked
                      }
                      multiple
                      asChild
                    >
                      <Card
                        variant='subtle'
                        padding='sm'
                        className={`transition ${
                          isScanDraftDropActive
                            ? 'border-cyan-500/70 bg-cyan-500/10'
                            : 'bg-card/30'
                        }`}
                      >
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='text-xs font-medium text-gray-200'>
                            Document Slots
                          </div>
                          <div className='ml-auto flex items-center gap-2'>
                            <Button
                              type='button'
                              disabled={
                                isUploadingScanDraftFiles ||
                                isEditingDocumentLocked
                              }
                              className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60 disabled:opacity-60'
                            >
                              {isUploadingScanDraftFiles
                                ? 'Uploading...'
                                : 'Upload Files'}
                            </Button>
                            <Button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunScanDraftOcr();
                              }}
                              disabled={
                                (editingDocumentDraft.scanSlots ?? [])
                                  .length === 0 ||
                                isUploadingScanDraftFiles ||
                                uploadingScanSlotId !== null ||
                                isEditingDocumentLocked
                              }
                              className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60'
                            >
                              {uploadingScanSlotId !== null
                                ? 'Running OCR...'
                                : 'Run OCR'}
                            </Button>
                          </div>
                        </div>
                        <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
                          <span>
                            OCR model and prompt are controlled in Case Resolver
                            Settings.
                          </span>
                          <Badge
                            variant='outline'
                            className='px-1.5 py-0 text-[9px] uppercase tracking-wide'
                          >
                            {scanOcrProviderLabel}
                          </Badge>
                          <span className='font-mono text-[10px] text-gray-400'>
                            {configuredScanOcrModel ||
                              'No OCR model configured'}
                          </span>
                        </div>
                        <div className='mt-1 text-[11px] text-gray-500'>
                          Drag and drop image or PDF files here, or use Upload
                          Files.
                        </div>
                        <div className='mt-2 max-h-32 space-y-1 overflow-auto pr-1'>
                          {(editingDocumentDraft.scanSlots ?? []).length ===
                          0 ? (
                              <div className='rounded border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-gray-500'>
                              No files uploaded yet.
                              </div>
                            ) : (
                              (editingDocumentDraft.scanSlots ?? []).map(
                                (slot) => {
                                  const statusLabel =
                                  uploadingScanSlotId === 'all' ||
                                  uploadingScanSlotId === slot.id
                                    ? 'Processing OCR...'
                                                                          : slot.ocrError
                                                                            ? 'OCR failed'
                                                                            : (slot.ocrText || '').trim().length > 0
                                                                              ? 'OCR extracted'
                                                                              : 'OCR pending';                                  return (
                                    <Card
                                      key={slot.id}
                                      variant='subtle-compact'
                                      padding='none'
                                      className='flex items-center justify-between gap-2 bg-card/30 px-2 py-1.5 text-[11px]'
                                    >
                                      <div className='min-w-0'>
                                        <div className='truncate text-gray-200'>
                                          {slot.name || 'Untitled file'}
                                        </div>
                                        <div className='text-gray-500'>
                                          {statusLabel}
                                        </div>
                                        {slot.ocrError ? (
                                          <div
                                            className='truncate text-[10px] text-red-300'
                                            title={slot.ocrError}
                                          >
                                            {slot.ocrError}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className='flex items-center gap-2'>
                                        {slot.filepath ? (
                                          <a
                                            href={slot.filepath}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='text-cyan-200 hover:text-cyan-100'
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                          Open
                                          </a>
                                        ) : null}
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='xs'
                                          disabled={
                                            isUploadingScanDraftFiles ||
                                          uploadingScanSlotId !== null ||
                                          isEditingDocumentLocked
                                          }
                                          className='h-6 px-2 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200'
                                          onClick={(e): void => {
                                            e.stopPropagation();
                                            handleDeleteScanDraftSlot(slot.id);
                                          }}
                                        >
                                        Delete
                                        </Button>
                                      </div>
                                    </Card>
                                  );
                                },
                              )
                            )}
                        </div>
                      </Card>
                    </FileUploadTrigger>
                  ) : null}

                  <Tabs
                    value={editorDetailsTab}
                    onValueChange={(value: string): void => {
                      if (
                        value === 'document' ||
                        value === 'relations' ||
                        value === 'metadata' ||
                        value === 'revisions'
                      ) {
                        setEditorDetailsTab(value);
                      }
                    }}
                    className='space-y-3'
                  >
                    <TabsList className='h-9'>
                      <TabsTrigger value='document' className='text-xs'>
                        Document
                      </TabsTrigger>
                      <TabsTrigger value='relations' className='text-xs'>
                        Relations
                      </TabsTrigger>
                      <TabsTrigger value='metadata' className='text-xs'>
                        Case Metadata
                      </TabsTrigger>
                      <TabsTrigger value='revisions' className='text-xs'>
                        Revisions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value='document' className='mt-0'>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <FormField label='Name'>
                          <Input
                            value={editingDocumentDraft.name}
                            disabled={isEditingDocumentLocked}
                            onChange={(event) => {
                              updateEditingDocumentDraft({
                                name: event.target.value,
                              });
                            }}
                          />
                        </FormField>

                        <FormField label='Document Date'>
                          <Input
                            type='date'
                            value={editingDocumentDraft.documentDate?.isoDate || ''}
                            disabled={isEditingDocumentLocked}
                            onChange={(event) => {
                              const isoDate = event.target.value;
                              const current = editingDocumentDraft.documentDate;
                              updateEditingDocumentDraft({
                                documentDate: current 
                                  ? { ...current, isoDate } 
                                  : {
                                    isoDate,
                                    source: 'text',
                                    sourceLine: null,
                                    cityHint: null,
                                    city: null,
                                    action: 'useDetectedDate',
                                  },
                              });
                            }}
                          />
                        </FormField>

                        <FormField label='City'>
                          <Input
                            value={editingDocumentDraft.documentCity ?? ''}
                            disabled={isEditingDocumentLocked}
                            onChange={(event) => {
                              updateEditingDocumentDraft({
                                documentCity: event.target.value,
                              });
                            }}
                            placeholder='City'
                          />
                        </FormField>

                        <FormField label='Addresser'>
                          <div className='space-y-2'>
                            <div className='grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]'>
                              <SelectSimple
                                size='sm'
                                value={addresserPartySearchKind}
                                disabled={isEditingDocumentLocked}
                                onValueChange={(value: string): void => {
                                  if (
                                    value !== 'person' &&
                                    value !== 'organization'
                                  )
                                    return;
                                  setAddresserPartySearchKind(value);
                                }}
                                options={
                                  CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS
                                }
                                placeholder='Lookup scope'
                                triggerClassName='h-9'
                              />
                              <SearchInput
                                value={addresserPartyQuery}
                                disabled={isEditingDocumentLocked}
                                onChange={(event): void => {
                                  setAddresserPartyQuery(event.target.value);
                                }}
                                onClear={(): void => {
                                  setAddresserPartyQuery('');
                                }}
                                placeholder='Search addresser'
                                size='sm'
                                className='h-9'
                              />
                            </div>
                            <SelectSimple
                              size='sm'
                              value={encodeFilemakerPartyReference(
                                editingDocumentDraft.addresser,
                              )}
                              disabled={isEditingDocumentLocked}
                              onValueChange={(value: string): void => {
                                const nextReference =
                                  decodeFilemakerPartyReference(value, filemakerDatabase);
                                if (nextReference?.kind) {
                                  setAddresserPartySearchKind(
                                    nextReference.kind,
                                  );
                                }
                                updateEditingDocumentDraft({
                                  addresser: nextReference,
                                });
                              }}
                              options={addresserPartyOptions}
                              placeholder='Select addresser'
                              triggerClassName='h-9'
                            />
                            <div className='flex justify-end'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='h-6 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                                disabled={
                                  editingDocumentDraft.addresser === null ||
                                  isEditingDocumentLocked
                                }
                                onClick={(): void => {
                                  updateEditingDocumentDraft({
                                    addresser: null,
                                  });
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        </FormField>

                        <FormField label='Addressee'>
                          <div className='space-y-2'>
                            <div className='grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]'>
                              <SelectSimple
                                size='sm'
                                value={addresseePartySearchKind}
                                disabled={isEditingDocumentLocked}
                                onValueChange={(value: string): void => {
                                  if (
                                    value !== 'person' &&
                                    value !== 'organization'
                                  )
                                    return;
                                  setAddresseePartySearchKind(value);
                                }}
                                options={
                                  CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS
                                }
                                placeholder='Lookup scope'
                                triggerClassName='h-9'
                              />
                              <SearchInput
                                value={addresseePartyQuery}
                                disabled={isEditingDocumentLocked}
                                onChange={(event): void => {
                                  setAddresseePartyQuery(event.target.value);
                                }}
                                onClear={(): void => {
                                  setAddresseePartyQuery('');
                                }}
                                placeholder='Search addressee'
                                size='sm'
                                className='h-9'
                              />
                            </div>
                            <SelectSimple
                              size='sm'
                              value={encodeFilemakerPartyReference(
                                editingDocumentDraft.addressee,
                              )}
                              disabled={isEditingDocumentLocked}
                              onValueChange={(value: string): void => {
                                const nextReference =
                                  decodeFilemakerPartyReference(value, filemakerDatabase);
                                if (nextReference?.kind) {
                                  setAddresseePartySearchKind(
                                    nextReference.kind,
                                  );
                                }
                                updateEditingDocumentDraft({
                                  addressee: nextReference,
                                });
                              }}
                              options={addresseePartyOptions}
                              placeholder='Select addressee'
                              triggerClassName='h-9'
                            />
                            <div className='flex justify-end'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='h-6 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                                disabled={
                                  editingDocumentDraft.addressee === null ||
                                  isEditingDocumentLocked
                                }
                                onClick={(): void => {
                                  updateEditingDocumentDraft({
                                    addressee: null,
                                  });
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        </FormField>
                      </div>
                    </TabsContent>

                    <TabsContent value='relations' className='mt-0'>
                      <div
                        className='grid gap-3 md:grid-cols-2'
                        onDragOver={(event): void => {
                          if (event.dataTransfer.types.includes(DRAG_KEYS.CASE_RESOLVER_ITEM)) {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsRelationsDropActive(true);
                          }
                        }}
                        onDragLeave={(): void => { setIsRelationsDropActive(false); }}
                        onDrop={(event): void => {
                          setIsRelationsDropActive(false);
                          const raw = event.dataTransfer.getData(DRAG_KEYS.CASE_RESOLVER_ITEM);
                          if (!raw || !editingDocumentDraft) return;
                          try {
                            const payload = JSON.parse(raw) as { entity?: string; fileId?: string };
                            if (
                              payload.entity === 'file' &&
                              payload.fileId &&
                              payload.fileId !== editingDocumentDraft.id
                            ) {
                              event.preventDefault();
                              state.handleLinkRelatedFiles(editingDocumentDraft.id, payload.fileId);
                            }
                          } catch { /* ignore */ }
                        }}
                      >
                        <FormField
                          label='Related Documents'
                          className='md:col-span-2'
                        >
                          <div
                            className={`space-y-1 rounded transition-colors ${isRelationsDropActive ? 'ring-2 ring-blue-500/40 ring-offset-1 ring-offset-background' : ''}`}
                          >
                            {relatedFiles.length === 0 ? (
                              <div
                                className={`rounded border px-3 py-3 text-xs text-gray-500 transition-colors ${isRelationsDropActive ? 'border-blue-500/40 bg-blue-500/5' : 'border-dashed border-border/60'}`}
                              >
                                No related documents yet. Drag a document from the file tree here, or drag
                                one document onto another in the tree to link them.
                              </div>
                            ) : (
                              relatedFiles.map((relatedFile) => {
                                const isSelected = selectedRelatedFileId === relatedFile.id;
                                return (
                                  <div
                                    key={relatedFile.id}
                                    className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 transition-colors ${isSelected ? 'border-blue-500/40 bg-blue-500/10' : 'border-border/60 bg-card/20 hover:bg-card/40'}`}
                                    onClick={(): void => {
                                      setSelectedRelatedFileId(isSelected ? null : relatedFile.id);
                                    }}
                                  >
                                    <FileText className='h-3.5 w-3.5 shrink-0 text-gray-400' />
                                    <div className='min-w-0 flex-1'>
                                      <div className='truncate text-xs text-gray-200'>{relatedFile.name}</div>
                                      {relatedFile.folder ? (
                                        <div className='truncate text-[11px] text-gray-500'>{relatedFile.folder}</div>
                                      ) : null}
                                    </div>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='sm'
                                      className='h-6 px-1.5 text-[11px] text-gray-400 hover:text-red-400'
                                      disabled={isEditingDocumentLocked}
                                      onClick={(e): void => {
                                        e.stopPropagation();
                                        state.handleUnlinkRelatedFile(editingDocumentDraft.id, relatedFile.id);
                                        if (selectedRelatedFileId === relatedFile.id) setSelectedRelatedFileId(null);
                                      }}
                                    >
                                      Unlink
                                    </Button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </FormField>

                        {selectedRelatedFile ? (
                          <div className='space-y-2 md:col-span-2'>
                            <div className='flex items-center justify-between gap-2'>
                              <div className='text-xs font-medium text-gray-300'>{selectedRelatedFile.name}</div>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='h-7 text-[11px]'
                                onClick={(): void => {
                                  handleOpenFileEditor(selectedRelatedFile.id);
                                  setEditorDetailsTab('document');
                                }}
                              >
                                Open &amp; Edit →
                              </Button>
                            </div>
                            <div className='max-h-64 overflow-y-auto rounded border border-border/60 bg-card/10'>
                              <DocumentWysiwygEditor
                                key={`related-preview-${selectedRelatedFile.id}`}
                                value={selectedRelatedFile.documentContentHtml ?? ''}
                                onChange={(): void => { /* readonly */ }}
                                disabled
                                surfaceClassName='min-h-[80px]'
                              />
                            </div>
                          </div>
                        ) : null}

                        <FormField
                          label='Link a Document'
                          className='md:col-span-2'
                        >
                          <div className='space-y-1'>
                            <SearchInput
                              size='sm'
                              value={relateSearchQuery}
                              placeholder='Search by name or folder...'
                              onChange={(e): void => setRelateSearchQuery(e.target.value)}
                              onClear={(): void => setRelateSearchQuery('')}
                              disabled={isEditingDocumentLocked}
                            />
                            {relateSearchQuery.trim() ? (
                              relateSearchResults.length === 0 ? (
                                <div className='px-2 py-2 text-xs text-gray-500'>
                                  No matching documents.
                                </div>
                              ) : (
                                <div className='max-h-52 overflow-y-auto rounded border border-border/60 bg-card/10'>
                                  {relateSearchResults.map((result) => (
                                    <button
                                      key={result.id}
                                      type='button'
                                      className='flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-card/60'
                                      onClick={(): void => {
                                        state.handleLinkRelatedFiles(editingDocumentDraft.id, result.id);
                                        setRelateSearchQuery('');
                                      }}
                                    >
                                      <FileText className='h-3.5 w-3.5 shrink-0 text-gray-400' />
                                      <div className='min-w-0 flex-1'>
                                        <div className='truncate text-xs text-gray-200'>{result.name}</div>
                                        {result.folder ? (
                                          <div className='truncate text-[11px] text-gray-500'>{result.folder}</div>
                                        ) : null}
                                      </div>
                                      <span className='shrink-0 text-[10px] text-teal-400'>
                                        Link
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )
                            ) : null}
                          </div>
                        </FormField>

                        <FormField
                          label='Connected Node Canvases'
                          className='md:col-span-2'
                        >
                          <div className='mb-2 flex justify-end'>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 text-[11px]'
                              disabled={isEditingDocumentLocked}
                              onClick={(): void => {
                                handleCreateNodeFile(
                                  editingDocumentDraft.folder ?? null,
                                );
                              }}
                            >
                              New Node File
                            </Button>
                          </div>
                          {connectedNodeCanvasLinks.length === 0 ? (
                            <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
                              Not connected to any node canvas yet. Add this
                              document to a node canvas to link it.
                            </div>
                          ) : (
                            <div className='flex flex-wrap gap-2'>
                              {connectedNodeCanvasLinks.map((entry) => (
                                <Button
                                  key={entry.assetId}
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  className='h-7 text-[11px]'
                                  onClick={(): void => {
                                    handleOpenConnectedNodeCanvas(
                                      entry.assetId,
                                    );
                                  }}
                                >
                                  {entry.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </FormField>

                        <FormField
                          label='Node Stream Settings'
                          className='md:col-span-2'
                        >
                          {editingDocumentNodeMeta ? (
                            <div className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
                              <div className='text-[11px] text-gray-400'>
                                Active node:{' '}
                                <span className='text-gray-200'>
                                  {editingDocumentNodeMeta.nodeTitle}
                                </span>{' '}
                                in{' '}
                                <span className='text-gray-200'>
                                  {editingDocumentNodeMeta.canvasFileName}
                                </span>
                              </div>
                              <div className='grid gap-3 md:grid-cols-2'>
                                <FormField label='Quotation Wrapper'>
                                  <SelectSimple
                                    size='sm'
                                    value={editingDocumentNodeMeta.quoteMode}
                                    disabled={isEditingDocumentLocked}
                                    onValueChange={(value: string): void => {
                                      if (
                                        value === 'none' ||
                                        value === 'double' ||
                                        value === 'single'
                                      ) {
                                        updateEditingDocumentNodeMeta({
                                          quoteMode: value,
                                        });
                                      }
                                    }}
                                    options={CASE_RESOLVER_QUOTE_MODE_OPTIONS}
                                    triggerClassName='h-9'
                                  />
                                </FormField>

                                <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                                  <div className='text-xs text-gray-300'>
                                    Append new line at end
                                  </div>
                                  <Checkbox
                                    checked={
                                      editingDocumentNodeMeta.appendTrailingNewline ===
                                      true
                                    }
                                    disabled={isEditingDocumentLocked}
                                    onCheckedChange={(
                                      checked: boolean,
                                    ): void => {
                                      updateEditingDocumentNodeMeta({
                                        appendTrailingNewline: checked,
                                      });
                                    }}
                                  />
                                </div>

                                <FormField
                                  label='Text Color (Content Output)'
                                  className='md:col-span-2'
                                >
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <Input
                                      type='color'
                                      disabled={isEditingDocumentLocked}
                                      value={
                                        CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(
                                          editingDocumentNodeMeta.textColor ??
                                            '',
                                        )
                                          ? editingDocumentNodeMeta.textColor
                                          : '#ffffff'
                                      }
                                      onChange={(event): void => {
                                        const nextColor =
                                          event.target.value.trim();
                                        if (
                                          !CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(
                                            nextColor,
                                          )
                                        )
                                          return;
                                        updateEditingDocumentNodeMeta({
                                          textColor: nextColor,
                                        });
                                      }}
                                      className='h-9 w-14 p-1'
                                    />
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='sm'
                                      className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                                      disabled={
                                        !editingDocumentNodeMeta.textColor ||
                                        isEditingDocumentLocked
                                      }
                                      onClick={(): void => {
                                        updateEditingDocumentNodeMeta({
                                          textColor: '',
                                        });
                                      }}
                                    >
                                      Clear
                                    </Button>
                                    <span className='text-[11px] text-gray-500'>
                                      {editingDocumentNodeMeta.textColor
                                        ? `Using ${editingDocumentNodeMeta.textColor}`
                                        : 'No color wrapper'}
                                    </span>
                                  </div>
                                </FormField>
                              </div>
                            </div>
                          ) : (
                            <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
                              Open this document from a canvas node to configure
                              node-level stream formatting.
                            </div>
                          )}
                        </FormField>
                      </div>
                    </TabsContent>

                    <TabsContent value='metadata' className='mt-0'>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <FormField
                          label='Reference Cases'
                          className='md:col-span-2'
                        >
                          <MultiSelect
                            options={caseReferenceOptions.filter(
                              (option) =>
                                option.value !== editingDocumentDraft.id,
                            )}
                            selected={(
                              editingDocumentDraft.referenceCaseIds ?? []
                            ).filter(
                              (referenceId: string) =>
                                referenceId !== editingDocumentDraft.id,
                            )}
                            disabled={isEditingDocumentLocked}
                            onChange={(values: string[]): void => {
                              updateEditingDocumentDraft({
                                referenceCaseIds: values.filter(
                                  (referenceId: string) =>
                                    referenceId !== editingDocumentDraft.id,
                                ),
                              });
                            }}
                            placeholder='Select reference cases'
                            searchPlaceholder='Search cases...'
                            emptyMessage='No cases available.'
                            className='w-full'
                          />
                        </FormField>

                        <FormField label='Parent Case'>
                          <SelectSimple
                            size='sm'
                            value={
                              editingDocumentDraft.parentCaseId ?? '__none__'
                            }
                            disabled={isEditingDocumentLocked}
                            onValueChange={(value: string): void => {
                              updateEditingDocumentDraft({
                                parentCaseId:
                                  value === '__none__' ? null : value,
                              });
                            }}
                            options={parentCaseOptions.filter(
                              (option) =>
                                option.value === '__none__' ||
                                option.value !== editingDocumentDraft.id,
                            )}
                            placeholder='Parent case'
                            triggerClassName='h-9'
                          />
                        </FormField>

                        <FormField label='Tag'>
                          <SelectSimple
                            size='sm'
                            value={editingDocumentDraft.tagId ?? '__none__'}
                            disabled={isEditingDocumentLocked}
                            onValueChange={(value: string): void => {
                              updateEditingDocumentDraft({
                                tagId: value === '__none__' ? null : value,
                              });
                            }}
                            options={caseTagOptions}
                            placeholder='Select tag'
                            triggerClassName='h-9'
                          />
                        </FormField>

                        <FormField label='Case Identifier'>
                          <SelectSimple
                            size='sm'
                            value={
                              editingDocumentDraft.caseIdentifierId ??
                              '__none__'
                            }
                            disabled={isEditingDocumentLocked}
                            onValueChange={(value: string): void => {
                              updateEditingDocumentDraft({
                                caseIdentifierId:
                                  value === '__none__' ? null : value,
                              });
                            }}
                            options={caseIdentifierOptions}
                            placeholder='Select case identifier'
                            triggerClassName='h-9'
                          />
                        </FormField>

                        <FormField label='Category'>
                          <SelectSimple
                            size='sm'
                            value={
                              editingDocumentDraft.categoryId ?? '__none__'
                            }
                            disabled={isEditingDocumentLocked}
                            onValueChange={(value: string): void => {
                              updateEditingDocumentDraft({
                                categoryId: value === '__none__' ? null : value,
                              });
                            }}
                            options={caseCategoryOptions}
                            placeholder='Select category'
                            triggerClassName='h-9'
                          />
                        </FormField>
                      </div>
                    </TabsContent>

                    <TabsContent value='revisions' className='mt-0'>
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs'>
                          <span className='text-gray-400'>
                            Revision{' '}
                            {editingDocumentDraft.baseDocumentContentVersion}
                            {isEditorDraftDirty
                              ? ' · unsaved changes'
                              : ' · saved'}
                          </span>
                          {(
                            editingDocumentDraft.documentConversionWarnings ??
                            []
                          ).length > 0 ? (
                              <span className='text-amber-300'>
                                {
                                  (editingDocumentDraft.documentConversionWarnings ??
                                  [])[0]
                                }
                              </span>
                            ) : null}
                        </div>
                        {(editingDocumentDraft.documentHistory ?? []).length ===
                        0 ? (
                            <div className='rounded border border-dashed border-border/60 px-3 py-3 text-xs text-gray-500'>
                            No saved versions yet. Once you save an overwrite,
                            the previous text will appear here.
                            </div>
                          ) : (
                            <div className='space-y-2'>
                              {(editingDocumentDraft.documentHistory ?? []).map(
                                (entry: CaseResolverDocumentHistoryEntry) => (
                                  <div
                                    key={entry.id}
                                    className='rounded border border-border/60 bg-card/20 px-3 py-2 text-xs'
                                  >
                                    <div className='flex flex-wrap items-center justify-between gap-2'>
                                      <div className='text-gray-300'>
                                      Version {entry.documentContentVersion} ·{' '}
                                        {entry.editorType.toUpperCase()}
                                      </div>
                                      <div className='text-[11px] text-gray-500'>
                                        {formatHistoryTimestamp(entry.savedAt || '')}
                                      </div>
                                    </div>
                                    <div className='mt-2 max-h-28 overflow-auto rounded border border-border/60 bg-card/30 px-2 py-1.5 font-mono text-[11px] text-gray-400 whitespace-pre-wrap'>
                                      {(entry.documentContentPlainText || '').trim()
                                        .length > 0
                                        ? entry.documentContentPlainText
                                        : '(Empty version)'}
                                    </div>
                                    <div className='mt-2 flex justify-end'>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='h-7 text-[11px]'
                                        disabled={isEditingDocumentLocked}
                                        onClick={(): void => {
                                          handleUseHistoryEntry(entry);
                                        }}
                                      >
                                      Load Into Editor
                                      </Button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className='flex justify-end gap-2'>
                    {showPromptExploderTransferCard ? (
                      <div
                        className={
                          hasExpiredPromptTransfer ||
                          hasBlockingPendingPromptExploderMismatch
                            ? 'rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100'
                            : 'rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'
                        }
                      >
                        <div className='font-medium'>
                          Pending Prompt Exploder output
                          {pendingPromptExploderPayload?.caseResolverContext
                            ?.fileName
                            ? ` from "${pendingPromptExploderPayload.caseResolverContext.fileName}".`
                            : pendingPromptExploderTargetFileLabel
                              ? ` targeting "${pendingPromptExploderTargetFileLabel}".`
                              : '.'}
                        </div>
                        <div className='mt-1 flex flex-wrap gap-1'>
                          <Badge variant='outline' className='text-[10px]'>
                            Stage: {promptTransferStatusLabel}
                          </Badge>
                          {pendingPromptExploderTargetFileLabel ? (
                            <Badge variant='outline' className='text-[10px]'>
                              Target: {pendingPromptExploderTargetFileLabel}
                            </Badge>
                          ) : null}
                          {pendingPromptExploderSessionId ? (
                            <Badge variant='outline' className='text-[10px]'>
                              Session: {pendingPromptExploderSessionId}
                            </Badge>
                          ) : null}
                          {pendingPromptTransferId ? (
                            <Badge variant='outline' className='text-[10px]'>
                              Transfer: {pendingPromptTransferId}
                            </Badge>
                          ) : null}
                          {pendingPromptTransferCreatedAt ? (
                            <Badge variant='outline' className='text-[10px]'>
                              Created:{' '}
                              {formatHistoryTimestamp(
                                pendingPromptTransferCreatedAt,
                              )}
                            </Badge>
                          ) : null}
                        </div>
                        <div className='mt-1'>
                          {hasExpiredPromptTransfer ? (
                            'This transfer expired before apply. Discard it and re-send from Prompt Exploder.'
                          ) : hasBlockingPendingPromptExploderMismatch ? (
                            <>
                              {promptExploderMismatchReason === 'document'
                                ? `This output targets "${pendingPromptExploderTargetFileLabel ?? pendingPromptExploderContextFileId}", but you are editing "${currentPromptExploderBindingFileLabel ?? requestedContextFileId}".`
                                : 'This output belongs to a different Prompt Exploder session.'}{' '}
                              Open the target document or discard this pending
                              output.
                            </>
                          ) : showPromptExploderManualRetry ? (
                            'Automatic apply failed. Retry apply or discard this output.'
                          ) : (
                            'Apply this output manually, or keep waiting for automatic apply.'
                          )}
                        </div>
                        {hasBlockingPendingPromptExploderMismatch ? (
                          <div className='mt-2 flex flex-wrap justify-end gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              className='h-7 text-[11px]'
                              onClick={handleOpenPromptExploderTargetDocument}
                              disabled={!pendingPromptExploderContextFileId}
                            >
                              Open Target Document
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              className='h-7 text-[11px]'
                              disabled={isApplyingPromptExploderPartyProposal}
                              onClick={(): void => {
                                handleDiscardPendingPromptExploderPayload();
                              }}
                            >
                              Discard Pending Output
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {ENABLE_CASE_RESOLVER_TRANSFER_DIAGNOSTICS &&
                  promptExploderApplyDiagnostics ? (
                      <div className='rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100'>
                        <div className='font-medium tracking-wide text-cyan-50'>
                        Prompt Exploder Transfer Diagnostics
                        </div>
                        <div className='mt-1 grid gap-1 sm:grid-cols-2'>
                          <div>
                            <span className='text-cyan-200'>Status:</span>{' '}
                            {promptExploderApplyDiagnostics.status}
                            {promptExploderApplyDiagnostics.reason
                              ? ` (${promptExploderApplyDiagnostics.reason})`
                              : ''}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Target Resolution:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.resolutionStrategy}
                          </div>
                          <div>
                            <span className='text-cyan-200'>Apply Attempt:</span>{' '}
                            {promptExploderApplyDiagnostics.applyAttemptId}
                          </div>
                          <div>
                            <span className='text-cyan-200'>Transfer ID:</span>{' '}
                            {promptExploderApplyDiagnostics.transferId ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Payload Version:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.payloadVersion ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>Payload Status:</span>{' '}
                            {promptExploderApplyDiagnostics.payloadStatus ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Payload Checksum:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.payloadChecksum ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Payload Created At:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.payloadCreatedAt ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Precheck Resolution:
                            </span>{' '}
                            {
                              promptExploderApplyDiagnostics.precheckResolutionStrategy
                            }
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Requested Target:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.requestedTargetFileId ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Fallback Target:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.fallbackTargetFileId ??
                            '(none)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Resolved Target:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.resolvedTargetFileId ??
                            '(unresolved)'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Mutation Resolution:
                            </span>{' '}
                            {
                              promptExploderApplyDiagnostics.mutationResolutionStrategy
                            }
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            File Count (Precheck/Mutation):
                            </span>{' '}
                            {
                              promptExploderApplyDiagnostics.precheckWorkspaceFileCount
                            }
                            {' / '}
                            {
                              promptExploderApplyDiagnostics.mutationWorkspaceFileCount
                            }
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Payload Parties:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.hasPartiesPayload
                              ? 'yes'
                              : 'no'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>Payload Date:</span>{' '}
                            {promptExploderApplyDiagnostics.hasMetadataPayload
                              ? 'yes'
                              : 'no'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Capture Enabled:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.captureSettingsEnabled
                              ? 'yes'
                              : 'no'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>Proposal Built:</span>{' '}
                            {promptExploderApplyDiagnostics.proposalBuilt
                              ? 'yes'
                              : 'no'}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Proposal Reason:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.proposalReason}
                          </div>
                          <div>
                            <span className='text-cyan-200'>
                            Mutation Missing After Precheck:
                            </span>{' '}
                            {promptExploderApplyDiagnostics.mutationMissingAfterPrecheck
                              ? 'yes'
                              : 'no'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                  <div className='flex flex-wrap justify-end gap-2'>
                    {promptExploderPartyProposal?.targetFileId ===
                    editingDocumentDraft.id ? (
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8'
                          disabled={isEditingDocumentLocked}
                          onClick={(): void => {
                            setIsPromptExploderPartyProposalOpen(true);
                          }}
                        >
                        Review Capture Mapping
                        </Button>
                      ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8'
                      disabled={isEditingDocumentLocked}
                      onClick={handleOpenPromptExploderForDraft}
                    >
                      Prompt Exploder: Extract + Reassemble
                    </Button>
                    {showPromptExploderApplyAction ? (
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8'
                        disabled={
                          !canApplyPendingPromptOutput ||
                          isApplyingPromptExploderPartyProposal ||
                          hasBlockingPendingPromptExploderMismatch ||
                          isEditingDocumentLocked
                        }
                        onClick={(): void => {
                          void handleApplyPendingPromptExploderPayload();
                        }}
                      >
                        {isApplyingPromptExploderPartyProposal
                          ? 'Applying Output...'
                          : 'Apply Prompt Exploder Output'}
                      </Button>
                    ) : null}
                    {showPromptExploderDiscardAction ? (
                      <Button
                        type='button'
                        variant='ghost'
                        className='h-8'
                        disabled={isApplyingPromptExploderPartyProposal}
                        onClick={(): void => {
                          handleDiscardPendingPromptExploderPayload();
                        }}
                      >
                        Discard Pending Output
                      </Button>
                    ) : null}
                  </div>

                  {editorDetailsTab !== 'relations' && (
                    <DocumentWysiwygEditor
                      key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentHtml ?? ''}
                      onChange={handleUpdateDraftDocumentContent}
                      disabled={isEditingDocumentLocked}
                      allowFontFamily
                      allowTextAlign
                      enableAdvancedTools
                      surfaceClassName='min-h-[300px]'
                      editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                    />
                  )}

                  <div className='flex justify-end gap-2'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-9 max-w-[220px] gap-1.5 truncate px-2 text-[11px] text-gray-400 hover:text-gray-100'
                      onClick={(): void => {
                        void handleCopyDraftFileId();
                      }}
                      title='Copy file ID'
                    >
                      <span className='truncate'>
                        ID: {editingDocumentDraft.id}
                      </span>
                      <Copy className='size-3' />
                    </Button>
                  </div>
                </div>
              </div>
            ) : activeFile ? (
              <CaseResolverCanvasWorkspace />
            ) : (
              <Card
                variant='subtle'
                padding='lg'
                className='flex flex-1 items-center justify-center border-dashed'
              >
                <EmptyState
                  icon={<FileText className='size-12 text-gray-600' />}
                  title='No case selected'
                  description='Select a file from the tree to begin.'
                  variant='compact'
                  className='border-none p-0'
                />
              </Card>
            )}
          </div>
        </div>

        <PromptExploderCaptureMappingModal
          open={isPromptExploderPartyProposalOpen}
          draft={promptExploderProposalDraft}
          applying={isApplyingPromptExploderPartyProposal}
          targetFileName={captureProposalTargetFileName}
          partyOptions={partyOptions}
          onClose={handleClosePromptExploderProposalModal}
          onApply={handleApplyPromptExploderProposal}
          onUpdateAction={updatePromptExploderProposalAction}
          onUpdateReference={updatePromptExploderProposalReference}
          onUpdateDateAction={updatePromptExploderProposalDateAction}
          resolveMatchedPartyLabel={resolvePromptExploderMatchedPartyLabel}
          diagnostics={captureApplyDiagnostics}
        />

        <ConfirmationModal />
        <PromptInputModal />
      </div>
    </CaseResolverPageProvider>
  );
}
