import { Copy, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import type {
  CaseResolverCaptureDocumentDateAction,
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import {
  DocumentWysiwygEditor,
  ensureHtmlForPreview,
  MarkdownSplitEditor,
} from '@/features/document-editor';
import {
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
} from '@/features/filemaker/settings';
import {
  AppModal,
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
  PanelHeader,
  EmptyState,
  FileUploadTrigger,
} from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { CaseResolverCanvasWorkspace } from './CaseResolverCanvasWorkspace';
import { CaseResolverFileViewer } from './CaseResolverFileViewer';
import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import { CaseResolverNodeFileWorkspace } from './CaseResolverNodeFileWorkspace';
import { CaseResolverRelationsWorkspace } from './CaseResolverRelationsWorkspace';
import { PromptExploderCaptureMappingModal } from './PromptExploderCaptureMappingModal';
import {
  CaseResolverPageProvider,
} from '../context/CaseResolverPageContext';
import { emitCaseResolverShowDocumentInCanvas } from '../drag';
import { useCaseResolverState } from '../hooks/useCaseResolverState';
import { buildCaseResolverNodeFileRelationIndexFromAssets } from '../nodefile-relations';
import { resolveCaseResolverOcrProviderLabel } from '../ocr-provider';
import {
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverFileEditDraft,
  type CaseResolverFile,
  type CaseResolverGraph,
  type CaseResolverIdentifier,
  type CaseResolverNodeMeta,
  type CaseResolverRelationGraph,
} from '../types';

const ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_MULTIFORMAT_EDITOR'] !== 'false';

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
  state: ReturnType<typeof useCaseResolverState>;
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
  handleScanDraftUploadInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTriggerScanDraftUpload: () => void;
  handleDeleteScanDraftSlot: (slotId: string) => void;
  handleRunScanDraftOcr: () => void;
  updateEditingDocumentDraft: (patch: Partial<CaseResolverFileEditDraft>) => void;
  editingDocumentNodeMeta: (CaseResolverNodeMeta & {
    nodeId: string;
    nodeTitle: string;
    canvasFileId: string;
    canvasFileName: string;
  }) | null;
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
    action: CaseResolverCaptureAction
  ) => void;
  updatePromptExploderProposalReference: (
    role: 'addresser' | 'addressee',
    value: string
  ) => void;
  updatePromptExploderProposalDateAction: (
    action: CaseResolverCaptureDocumentDateAction
  ) => void;
  resolvePromptExploderMatchedPartyLabel: (
    reference: CaseResolverCaptureProposalState['addresser'] extends infer T
      ? T extends { existingReference?: infer R | null }
        ? R | null | undefined
        : null | undefined
      : null | undefined
  ) => string;
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

const CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function CaseResolverPageView(props: CaseResolverPageViewProps): React.JSX.Element {
  const router = useRouter();
  const [showMarkdownPreview, setShowMarkdownPreview] = React.useState(true);
  const [addresserPartySearchKind, setAddresserPartySearchKind] =
    React.useState<PartySearchKind>('person');
  const [addresseePartySearchKind, setAddresseePartySearchKind] =
    React.useState<PartySearchKind>('organization');
  const [addresserPartyQuery, setAddresserPartyQuery] = React.useState('');
  const [addresseePartyQuery, setAddresseePartyQuery] = React.useState('');
  const [pendingPromptApplyTargetFileId, setPendingPromptApplyTargetFileId] = React.useState('');
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
    editorTextareaRef,
    editorSplitRef,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
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
  } = props;

  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    isWorkspaceDirty,
    isWorkspaceSaving,
    workspaceSaveStatus,
    workspaceSaveError,
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
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateNodeFile,
    handleCreateImageAsset,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleSaveWorkspace,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    setSelectedAssetId,
    handleUpdateSelectedAsset,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    pendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
    promptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    confirmAction,
    ConfirmationModal,
    PromptInputModal,
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
    const resolvedAddresserKind = editingDocumentDraft?.addresser?.kind ?? fallbackAddresserKind;
    const resolvedAddresseeKind = editingDocumentDraft?.addressee?.kind ?? fallbackAddresseeKind;

    setAddresserPartySearchKind(
      resolvedAddresserKind === 'organization' ? 'organization' : 'person'
    );
    setAddresseePartySearchKind(
      resolvedAddresseeKind === 'person' ? 'person' : 'organization'
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
      selectedReference: ReturnType<typeof decodeFilemakerPartyReference>
    ): SelectOption[] => {
      const normalizedQuery = query.trim().toLowerCase();
      const selectedValue = encodeFilemakerPartyReference(selectedReference);

      const filtered = partyOptions.filter((option): boolean => {
        if (option.value === 'none') {
          if (!normalizedQuery) return true;
          return 'none'.includes(normalizedQuery);
        }
        const optionReference = decodeFilemakerPartyReference(option.value);
        if (!optionReference) return false;
        const isSelected = option.value === selectedValue;
        if (optionReference.kind !== kind && !isSelected) return false;
        if (!normalizedQuery) return true;
        const searchSource = `${option.label} ${option.description ?? ''}`.toLowerCase();
        return searchSource.includes(normalizedQuery);
      });

      if (
        selectedValue &&
        selectedValue !== 'none' &&
        !filtered.some((option) => option.value === selectedValue)
      ) {
        const selectedOption = partyOptions.find((option) => option.value === selectedValue);
        if (selectedOption) {
          return [selectedOption, ...filtered];
        }
      }
      return filtered;
    },
    [partyOptions]
  );
  const pendingPromptApplyTargetOptions = React.useMemo<SelectOption[]>(
    () =>
      workspace.files
        .filter((file: CaseResolverFile): boolean =>
          file.fileType === 'document' || file.fileType === 'scanfile'
        )
        .map((file: CaseResolverFile) => ({
          value: file.id,
          label: file.name,
          description: file.folder ? `Folder: ${file.folder}` : 'Folder: (root)',
        })),
    [workspace.files]
  );

  const pendingPromptPayloadKey = React.useMemo(() => {
    if (!pendingPromptExploderPayload) return null;
    return [
      pendingPromptExploderPayload.createdAt,
      pendingPromptExploderPayload.caseResolverContext?.fileId ?? '',
      pendingPromptExploderPayload.prompt.length,
    ].join('|');
  }, [pendingPromptExploderPayload]);

  React.useEffect(() => {
    if (!pendingPromptExploderPayload) {
      setPendingPromptApplyTargetFileId('');
      return;
    }

    setPendingPromptApplyTargetFileId((current) => {
      if (
        current &&
        pendingPromptApplyTargetOptions.some((option: SelectOption) => option.value === current)
      ) {
        return current;
      }

      const preferredTargets = [
        editingDocumentDraft?.id ?? '',
        pendingPromptExploderPayload.caseResolverContext?.fileId ?? '',
      ].filter((value: string): boolean => value.trim().length > 0);
      for (const preferred of preferredTargets) {
        const match = pendingPromptApplyTargetOptions.find(
          (option: SelectOption) => option.value.trim() === preferred.trim()
        );
        if (match) return match.value;
      }

      return pendingPromptApplyTargetOptions[0]?.value ?? '';
    });
  }, [
    editingDocumentDraft?.id,
    pendingPromptApplyTargetOptions,
    pendingPromptExploderPayload,
    pendingPromptPayloadKey,
  ]);

  const canApplyPendingPromptOutput = Boolean(
    pendingPromptExploderPayload &&
    pendingPromptApplyTargetFileId &&
    pendingPromptApplyTargetOptions.some(
      (option: SelectOption) => option.value === pendingPromptApplyTargetFileId
    )
  );

  const addresserPartyOptions = React.useMemo(
    () =>
      filterPartyOptions(
        addresserPartySearchKind,
        addresserPartyQuery,
        editingDocumentDraft?.addresser ?? null
      ),
    [
      addresserPartyQuery,
      addresserPartySearchKind,
      editingDocumentDraft?.addresser,
      filterPartyOptions,
    ]
  );
  const addresseePartyOptions = React.useMemo(
    () =>
      filterPartyOptions(
        addresseePartySearchKind,
        addresseePartyQuery,
        editingDocumentDraft?.addressee ?? null
      ),
    [
      addresseePartyQuery,
      addresseePartySearchKind,
      editingDocumentDraft?.addressee,
      filterPartyOptions,
    ]
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
          file.id === activeCaseId && file.fileType === 'case'
      );
      if (activeCase) return activeCase;
    }
    if (activeFile?.fileType === 'case') return activeFile;
    if (activeFile?.parentCaseId) {
      const parentCase = workspace.files.find(
        (file: CaseResolverFile): boolean =>
          file.id === activeFile.parentCaseId && file.fileType === 'case'
      );
      if (parentCase) return parentCase;
    }
    return null;
  }, [activeCaseId, activeFile, workspace.files]);
  const activeCaseIdentifierId = activeCaseFile?.caseIdentifierId ?? null;
  const activeCaseIdentifierLabel = React.useMemo((): string | null => {
    if (!activeCaseIdentifierId) return null;
    const matchingIdentifier = caseResolverIdentifiers.find(
      (identifier: CaseResolverIdentifier): boolean =>
        identifier.id === activeCaseIdentifierId
    );
    return matchingIdentifier?.name ?? activeCaseIdentifierId;
  }, [activeCaseIdentifierId, caseResolverIdentifiers]);
  const handleFilterCasesBySignatureId = useCallback(
    (caseIdentifierId: string): void => {
      router.push(
        `/admin/case-resolver/cases?caseIdentifierId=${encodeURIComponent(caseIdentifierId)}`
      );
    },
    [router]
  );
  const headerDescription = React.useMemo((): React.ReactNode => {
    if (!activeCaseFile) return 'Admin / Case Resolver';
    if (!activeCaseIdentifierId || !activeCaseIdentifierLabel) {
      return <span className='text-muted-foreground/80'>No signature ID</span>;
    }
    return (
      <button
        type='button'
        className='rounded-full'
        title='Show cases filtered by this signature ID'
        onClick={(): void => {
          handleFilterCasesBySignatureId(activeCaseIdentifierId);
        }}
      >
        <Badge variant='outline' className='cursor-pointer hover:bg-muted/60'>
          Signature ID: {activeCaseIdentifierLabel}
        </Badge>
      </button>
    );
  }, [
    activeCaseFile,
    activeCaseIdentifierId,
    activeCaseIdentifierLabel,
    handleFilterCasesBySignatureId,
  ]);
  const connectedNodeCanvasLinks = React.useMemo((): Array<{
    assetId: string;
    label: string;
  }> => {
    if (!editingDocumentDraft || editingDocumentDraft.fileType === 'case') {
      return [];
    }
    const relationIndex = buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: workspace.assets,
    });
    const linkedAssetIds = relationIndex.nodeFileAssetIdsByDocumentFileId[editingDocumentDraft.id] ?? [];
    return linkedAssetIds
      .map((assetId: string) => workspace.assets.find((asset) => asset.id === assetId) ?? null)
      .filter((asset): asset is NonNullable<typeof asset> => asset !== null && asset.kind === 'node_file')
      .map((asset) => ({
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
          message: 'You have unsaved changes in this document. Keep editing or discard and open linked canvas?',
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
    ]
  );

  const handleCreateDocumentFromSearch = useCallback((): void => {
    setActiveMainView('workspace');
    handleCreateFile(null);
  }, [handleCreateFile, setActiveMainView]);

  const handleOpenFileFromSearch = useCallback((id: string): void => {
    setActiveMainView('workspace');
    handleSelectFile(id);
  }, [handleSelectFile, setActiveMainView]);

  const handleEditFileFromSearch = useCallback((id: string): void => {
    setActiveMainView('workspace');
    handleOpenFileEditor(id);
  }, [handleOpenFileEditor, setActiveMainView]);
  const fileEditorTitle = editingDocumentDraft?.fileType === 'scanfile'
    ? 'Edit Scan'
    : 'Edit Document';
  const handleRequestCloseFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    if (!isEditorDraftDirty) {
      handleDiscardFileEditorDraft();
      return;
    }
    confirmAction({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes in this document. Keep editing or discard them?',
      cancelText: 'Keep Editing',
      confirmText: 'Discard Changes',
      isDangerous: true,
      onConfirm: handleDiscardFileEditorDraft,
    });
  }, [
    confirmAction,
    editingDocumentDraft,
    handleDiscardFileEditorDraft,
    isEditorDraftDirty,
  ]);
  const hasUnsavedChanges = isWorkspaceDirty || isEditorDraftDirty;
  const confirmLeaveWithUnsavedChanges = useCallback((): boolean => {
    return window.confirm(
      'You have unsaved Case Resolver changes. Leave this page without saving?'
    );
  }, []);

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent): void => {
      if (!hasUnsavedChanges) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) return;
      const anchor = rawTarget.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href')?.trim() ?? '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
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
      const shouldLeave = confirmLeaveWithUnsavedChanges();
      if (shouldLeave) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('click', handleDocumentClick, true);
    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [confirmLeaveWithUnsavedChanges, hasUnsavedChanges]);

  React.useEffect(() => {
    const handlePopState = (): void => {
      if (!hasUnsavedChanges) return;
      if (confirmLeaveWithUnsavedChanges()) return;
      window.history.go(1);
    };
    window.addEventListener('popstate', handlePopState);
    return (): void => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [confirmLeaveWithUnsavedChanges, hasUnsavedChanges]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isSaveShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 's';
      if (!isSaveShortcut) return;
      event.preventDefault();
      if (editingDocumentDraft) {
        handleSaveFileEditor();
        return;
      }
      if (isWorkspaceSaving) return;
      handleSaveWorkspace();
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    editingDocumentDraft,
    handleSaveFileEditor,
    handleSaveWorkspace,
    isWorkspaceSaving,
  ]);

  React.useEffect(() => {
    if (editingDocumentDraft?.editorType !== 'markdown') return;
    setShowMarkdownPreview(true);
  }, [editingDocumentDraft?.id, editingDocumentDraft?.editorType]);

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      activeCaseId,
      requestedCaseStatus,
      canCreateInActiveCase,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      isWorkspaceDirty,
      isWorkspaceSaving,
      workspaceSaveStatus,
      workspaceSaveError,
      activeFile,
      selectedAsset,
      panelCollapsed: folderPanelCollapsed,
      onPanelCollapsedChange: setFolderPanelCollapsed,
      onSaveWorkspace: handleSaveWorkspace,
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
    }}>
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}
          
          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            <PanelHeader
              title={activeCaseFile?.name ?? 'Case Resolver'}
              description={headerDescription}
              className='mb-6'
              actions={[
                {
                  key: 'document',
                  label: selectedAsset?.kind === 'node_file' ? 'Node Canvas' : 'Document Canvas',
                  variant: workspaceView === 'document' ? 'default' : 'outline',
                  onClick: () => {
                    if (selectedAsset?.kind === 'node_file') {
                      setSelectedAssetId(null);
                    }
                    setWorkspaceView('document');
                  },
                },
                {
                  key: 'relations',
                  label: 'Relations Canvas',
                  variant: workspaceView === 'relations' ? 'default' : 'outline',
                  onClick: () => setWorkspaceView('relations'),
                },
                {
                  key: 'parties',
                  label: 'Parties & References',
                  variant: 'default',
                  onClick: () => {
                    if (!activeFile) return;
                    handleOpenFileEditor(activeFile.id);
                  },
                  disabled: Boolean(selectedAsset) || !activeFile || activeFile.fileType === 'case',
                }
              ]}
            />

            {workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace />
            ) : selectedAsset?.kind === 'node_file' ? (
              <CaseResolverNodeFileWorkspace />
            ) : selectedAsset ? (
              <CaseResolverFileViewer />
            ) : activeFile ? (
              <CaseResolverCanvasWorkspace />
            ) : (
              <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border'>
                <EmptyState
                  icon={<FileText className='size-12 text-gray-600' />}
                  title='No case selected'
                  description='Select a file from the tree to begin.'
                  className='border-none p-0'
                />
              </div>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => { if (!open) handleRequestCloseFileEditor(); }}
          title={fileEditorTitle}
          size='xl'
          showClose={false}
          header={(
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='min-w-0'>
                <div className='flex min-w-0 items-center gap-2'>
                  <Button
                    type='button'
                    onClick={handleSaveFileEditor}
                    size='sm'
                    disabled={!isEditorDraftDirty}
                    className={`min-w-[100px] rounded-md border text-xs transition-colors ${
                      isEditorDraftDirty
                        ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
                        : 'border-border/60 text-gray-500 hover:bg-transparent'
                    }`}
                  >
                    Save Changes
                  </Button>
                  <h2 className='truncate text-2xl font-bold tracking-tight text-white'>{fileEditorTitle}</h2>
                </div>
              </div>
              <div className='flex flex-wrap items-center justify-end gap-2'>
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
                <Button
                  type='button'
                  onClick={handleRequestCloseFileEditor}
                  variant='outline'
                  className='min-w-[100px]'
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              {editingDocumentDraft.fileType === 'scanfile' ? (
                <FileUploadTrigger
                  accept='image/*,application/pdf,.pdf'
                  onFilesSelected={(files) => handleUploadScanFiles(editingDocumentDraft.id, files)}
                  disabled={isUploadingScanDraftFiles}
                  multiple
                  asChild
                >
                  <div
                    className={`rounded border px-3 py-3 transition ${
                      isScanDraftDropActive
                        ? 'border-cyan-500/70 bg-cyan-500/10'
                        : 'border-border/60 bg-card/30'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-xs font-medium text-gray-200'>Document Slots</div>
                      <div className='ml-auto flex items-center gap-2'>
                        <Button
                          type='button'
                          disabled={isUploadingScanDraftFiles}
                          className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60 disabled:opacity-60'
                        >
                          {isUploadingScanDraftFiles ? 'Uploading...' : 'Upload Files'}
                        </Button>
                        <Button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunScanDraftOcr();
                          }}
                          disabled={
                            (editingDocumentDraft.scanSlots ?? []).length === 0 ||
                            isUploadingScanDraftFiles ||
                            uploadingScanSlotId !== null
                          }
                          className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60'
                        >
                          {uploadingScanSlotId !== null ? 'Running OCR...' : 'Run OCR'}
                        </Button>
                      </div>
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
                      <span>OCR model and prompt are controlled in Case Resolver Settings.</span>
                      <Badge variant='outline' className='px-1.5 py-0 text-[9px] uppercase tracking-wide'>
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
                            uploadingScanSlotId === 'all' || uploadingScanSlotId === slot.id
                              ? 'Processing OCR...'
                              : slot.ocrError
                                ? 'OCR failed'
                                : slot.ocrText.trim().length > 0
                                  ? 'OCR extracted'
                                  : 'OCR pending';
                          return (
                            <div
                              key={slot.id}
                              className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-2 py-1.5 text-[11px]'
                            >
                              <div className='min-w-0'>
                                <div className='truncate text-gray-200'>{slot.name || 'Untitled file'}</div>
                                <div className='text-gray-500'>{statusLabel}</div>
                                {slot.ocrError ? (
                                  <div className='truncate text-[10px] text-red-300' title={slot.ocrError}>
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
                                  disabled={isUploadingScanDraftFiles || uploadingScanSlotId !== null}
                                  className='h-6 px-2 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200'
                                  onClick={(e): void => {
                                    e.stopPropagation();
                                    handleDeleteScanDraftSlot(slot.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
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
                  <TabsTrigger value='document' className='text-xs'>Document</TabsTrigger>
                  <TabsTrigger value='relations' className='text-xs'>Relations</TabsTrigger>
                  <TabsTrigger value='metadata' className='text-xs'>Case Metadata</TabsTrigger>
                  <TabsTrigger value='revisions' className='text-xs'>Revisions</TabsTrigger>
                </TabsList>

                <TabsContent value='document' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FormField label='Name'>
                      <Input
                        value={editingDocumentDraft.name}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ name: event.target.value });
                        }}
                      />
                    </FormField>

                    <FormField label='Document Date'>
                      <Input
                        type='date'
                        value={editingDocumentDraft.documentDate}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ documentDate: event.target.value });
                        }}
                      />
                    </FormField>

                    <FormField label='Addresser'>
                      <div className='space-y-2'>
                        <div className='grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]'>
                          <SelectSimple
                            size='sm'
                            value={addresserPartySearchKind}
                            onValueChange={(value: string): void => {
                              if (value !== 'person' && value !== 'organization') return;
                              setAddresserPartySearchKind(value);
                            }}
                            options={CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS}
                            placeholder='Lookup scope'
                            triggerClassName='h-9'
                          />
                          <SearchInput
                            value={addresserPartyQuery}
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
                          value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                          onValueChange={(value: string): void => {
                            const nextReference = decodeFilemakerPartyReference(value);
                            if (nextReference?.kind) {
                              setAddresserPartySearchKind(nextReference.kind);
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
                            disabled={editingDocumentDraft.addresser === null}
                            onClick={(): void => {
                              updateEditingDocumentDraft({ addresser: null });
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
                            onValueChange={(value: string): void => {
                              if (value !== 'person' && value !== 'organization') return;
                              setAddresseePartySearchKind(value);
                            }}
                            options={CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS}
                            placeholder='Lookup scope'
                            triggerClassName='h-9'
                          />
                          <SearchInput
                            value={addresseePartyQuery}
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
                          value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                          onValueChange={(value: string): void => {
                            const nextReference = decodeFilemakerPartyReference(value);
                            if (nextReference?.kind) {
                              setAddresseePartySearchKind(nextReference.kind);
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
                            disabled={editingDocumentDraft.addressee === null}
                            onClick={(): void => {
                              updateEditingDocumentDraft({ addressee: null });
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
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FormField label='Connected Node Canvases' className='md:col-span-2'>
                      <div className='mb-2 flex justify-end'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 text-[11px]'
                          onClick={(): void => {
                            handleCreateNodeFile(editingDocumentDraft.folder ?? null);
                          }}
                        >
                          New Node File
                        </Button>
                      </div>
                      {connectedNodeCanvasLinks.length === 0 ? (
                        <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
                          Not connected to any node canvas yet. Add this document to a node canvas to link it.
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
                                handleOpenConnectedNodeCanvas(entry.assetId);
                              }}
                            >
                              {entry.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </FormField>

                    <FormField label='Node Stream Settings' className='md:col-span-2'>
                      {editingDocumentNodeMeta ? (
                        <div className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
                          <div className='text-[11px] text-gray-400'>
                            Active node: <span className='text-gray-200'>{editingDocumentNodeMeta.nodeTitle}</span>{' '}
                            in <span className='text-gray-200'>{editingDocumentNodeMeta.canvasFileName}</span>
                          </div>
                          <div className='grid gap-3 md:grid-cols-2'>
                            <FormField label='Quotation Wrapper'>
                              <SelectSimple
                                size='sm'
                                value={editingDocumentNodeMeta.quoteMode}
                                onValueChange={(value: string): void => {
                                  if (value === 'none' || value === 'double' || value === 'single') {
                                    updateEditingDocumentNodeMeta({ quoteMode: value });
                                  }
                                }}
                                options={CASE_RESOLVER_QUOTE_MODE_OPTIONS}
                                triggerClassName='h-9'
                              />
                            </FormField>

                            <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                              <div className='text-xs text-gray-300'>Append new line at end</div>
                              <Checkbox
                                checked={editingDocumentNodeMeta.appendTrailingNewline === true}
                                onCheckedChange={(checked: boolean): void => {
                                  updateEditingDocumentNodeMeta({
                                    appendTrailingNewline: checked,
                                  });
                                }}
                              />
                            </div>

                            <FormField label='Text Color (Content Output)' className='md:col-span-2'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <Input
                                  type='color'
                                  value={
                                    CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(
                                      editingDocumentNodeMeta.textColor ?? ''
                                    )
                                      ? editingDocumentNodeMeta.textColor
                                      : '#ffffff'
                                  }
                                  onChange={(event): void => {
                                    const nextColor = event.target.value.trim();
                                    if (!CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(nextColor)) return;
                                    updateEditingDocumentNodeMeta({ textColor: nextColor });
                                  }}
                                  className='h-9 w-14 p-1'
                                />
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                                  disabled={!editingDocumentNodeMeta.textColor}
                                  onClick={(): void => {
                                    updateEditingDocumentNodeMeta({ textColor: '' });
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
                          Open this document from a canvas node to configure node-level stream formatting.
                        </div>
                      )}
                    </FormField>
                  </div>
                </TabsContent>

                <TabsContent value='metadata' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FormField label='Reference Cases' className='md:col-span-2'>
                      <MultiSelect
                        options={caseReferenceOptions.filter(
                          (option) => option.value !== editingDocumentDraft.id
                        )}
                        selected={(editingDocumentDraft.referenceCaseIds ?? []).filter(
                          (referenceId: string) => referenceId !== editingDocumentDraft.id
                        )}
                        onChange={(values: string[]): void => {
                          updateEditingDocumentDraft({
                            referenceCaseIds: values.filter(
                              (referenceId: string) => referenceId !== editingDocumentDraft.id
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
                        value={editingDocumentDraft.parentCaseId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            parentCaseId: value === '__none__' ? null : value,
                          });
                        }}
                        options={parentCaseOptions.filter(
                          (option) => option.value === '__none__' || option.value !== editingDocumentDraft.id
                        )}
                        placeholder='Parent case'
                        triggerClassName='h-9'
                      />
                    </FormField>

                    <FormField label='Tag'>
                      <SelectSimple
                        size='sm'
                        value={editingDocumentDraft.tagId ?? '__none__'}
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
                        value={editingDocumentDraft.caseIdentifierId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            caseIdentifierId: value === '__none__' ? null : value,
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
                        value={editingDocumentDraft.categoryId ?? '__none__'}
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
                        Revision {editingDocumentDraft.baseDocumentContentVersion}
                        {isEditorDraftDirty ? ' · unsaved changes' : ' · saved'}
                      </span>
                      {(editingDocumentDraft.documentConversionWarnings ?? []).length > 0 ? (
                        <span className='text-amber-300'>
                          {(editingDocumentDraft.documentConversionWarnings ?? [])[0]}
                        </span>
                      ) : null}
                    </div>
                    {(editingDocumentDraft.documentHistory ?? []).length === 0 ? (
                      <div className='rounded border border-dashed border-border/60 px-3 py-3 text-xs text-gray-500'>
                        No saved versions yet. Once you save an overwrite, the previous text will appear here.
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {(editingDocumentDraft.documentHistory ?? []).map((entry: CaseResolverDocumentHistoryEntry) => (
                          <div
                            key={entry.id}
                            className='rounded border border-border/60 bg-card/20 px-3 py-2 text-xs'
                          >
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='text-gray-300'>
                                Version {entry.documentContentVersion} · {entry.editorType.toUpperCase()}
                              </div>
                              <div className='text-[11px] text-gray-500'>
                                {formatHistoryTimestamp(entry.savedAt)}
                              </div>
                            </div>
                            <div className='mt-2 max-h-28 overflow-auto rounded border border-border/60 bg-card/30 px-2 py-1.5 font-mono text-[11px] text-gray-400 whitespace-pre-wrap'>
                              {entry.documentContentPlainText.trim().length > 0
                                ? entry.documentContentPlainText
                                : '(Empty version)'}
                            </div>
                            <div className='mt-2 flex justify-end'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='h-7 text-[11px]'
                                onClick={(): void => {
                                  handleUseHistoryEntry(entry);
                                }}
                              >
                                Load Into Editor
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className='flex justify-end gap-2'>
                {pendingPromptExploderPayload ? (
                  <div className='rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100'>
                    Pending Prompt Exploder output
                    {pendingPromptExploderPayload.caseResolverContext?.fileName
                      ? ` from "${pendingPromptExploderPayload.caseResolverContext.fileName}".`
                      : '.'}
                    {' '}Apply it explicitly to this document or discard it.
                  </div>
                ) : null}
              </div>

              <div className='flex flex-wrap justify-end gap-2'>
                {promptExploderPartyProposal?.targetFileId === editingDocumentDraft.id ? (
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8'
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
                  onClick={handleOpenPromptExploderForDraft}
                >
                  Prompt Exploder: Extract + Reassemble
                </Button>
                {pendingPromptExploderPayload ? (
                  <SelectSimple
                    size='sm'
                    value={pendingPromptApplyTargetFileId || '__none__'}
                    onValueChange={(value: string): void => {
                      setPendingPromptApplyTargetFileId(value === '__none__' ? '' : value);
                    }}
                    options={
                      pendingPromptApplyTargetOptions.length > 0
                        ? pendingPromptApplyTargetOptions
                        : [{ value: '__none__', label: 'No document files available' }]
                    }
                    triggerClassName='h-8 min-w-[220px]'
                    placeholder='Choose target document'
                  />
                ) : null}
                {pendingPromptExploderPayload ? (
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8'
                    disabled={!canApplyPendingPromptOutput || isApplyingPromptExploderPartyProposal}
                    onClick={(): void => {
                      if (!pendingPromptApplyTargetFileId) return;
                      handleApplyPendingPromptExploderPayload(pendingPromptApplyTargetFileId);
                    }}
                  >
                    {isApplyingPromptExploderPartyProposal
                      ? 'Applying Output...'
                      : 'Apply Prompt Exploder Output'}
                  </Button>
                ) : null}
                {pendingPromptExploderPayload ? (
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

              {editingDocumentDraft.editorType === 'markdown' ? (
                <div className='flex items-center justify-end gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8'
                    onClick={(): void => {
                      setShowMarkdownPreview((current: boolean): boolean => !current);
                    }}
                  >
                    {showMarkdownPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                </div>
              ) : null}

              {ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR ? (
                <>
                  {editingDocumentDraft.editorType === 'wysiwyg' ? (
                    <DocumentWysiwygEditor
                      key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentHtml ?? ''}
                      onChange={handleUpdateDraftDocumentContent}
                      allowFontFamily
                      allowTextAlign
                      enableAdvancedTools
                      surfaceClassName='min-h-[300px]'
                      editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                    />
                  ) : (
                    <MarkdownSplitEditor
                      key={`case-resolver-markdown-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentMarkdown ?? ''}
                      onChange={handleUpdateDraftDocumentContent}
                      showPreview={showMarkdownPreview}
                      renderPreviewHtml={(value: string): string => ensureHtmlForPreview(value, 'markdown')}
                      sanitizePreviewHtml={sanitizeHtml}
                      textareaRef={editorTextareaRef}
                      splitRef={editorSplitRef}
                      editorWidth={editorWidth}
                      onEditorWidthChange={setEditorWidth}
                      isDraggingSplitter={isDraggingSplitter}
                      onDraggingSplitterChange={setIsDraggingSplitter}
                      placeholder='Enter document content'
                      textareaClassName='w-full min-h-[300px] rounded-lg border px-4 py-2 font-mono'
                    />
                  )}
                </>
              ) : (
                <DocumentWysiwygEditor
                  key={`case-resolver-wysiwyg-fallback-${editorContentRevisionSeed}`}
                  value={editingDocumentDraft.documentContentHtml ?? ''}
                  onChange={handleUpdateDraftDocumentContent}
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
                  <span className='truncate'>ID: {editingDocumentDraft.id}</span>
                  <Copy className='size-3' />
                </Button>
              </div>
            </div>
          )}
        </AppModal>

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
        />
        
        <ConfirmationModal />
        <PromptInputModal />
      </div>
    </CaseResolverPageProvider>
  );
}
