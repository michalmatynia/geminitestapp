'use client';

import { Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFileViewer } from '@/features/case-resolver/components/CaseResolverFileViewer';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRelationsWorkspace } from '@/features/case-resolver/components/CaseResolverRelationsWorkspace';
import {
  CaseResolverPageProvider,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import type {
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  CASE_RESOLVER_CAPTURE_ACTION_OPTIONS,
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import {
  DocumentWysiwygEditor,
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  MarkdownSplitEditor,
  toStorageDocumentValue,
} from '@/features/document-editor';
import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { savePromptExploderDraftPromptFromCaseResolver } from '@/features/prompt-exploder/bridge';
import {
  AppModal,
  Button,
  Input,
  Label,
  MultiSelect,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { buildPathLabelMap } from './admin-case-resolver-page-helpers';
import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  normalizeFolderPath,
  normalizeFolderPaths,
  renameFolderPath,
} from '../settings';
import { isPathWithinFolder } from '../utils/caseResolverUtils';

import type {
  CaseResolverCategory,
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
} from '../types';

const ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_MULTIFORMAT_EDITOR'] !== 'false';

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

export function AdminCaseResolverPage(): React.JSX.Element {
  const state = useCaseResolverState();
  const router = useRouter();
  const { toast } = useToast();
  const [workspaceView, setWorkspaceView] = React.useState<'document' | 'relations'>('document');
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    setActiveMainView,
    editingDocumentDraft,
    setEditingDocumentDraft,
    isUploadingScanDraftFiles,
    uploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverSettings,
    filemakerDatabase,
    requestedFileId,
    shouldOpenEditorFromQuery,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateImageAsset,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    updateWorkspace,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    confirmAction,
    ConfirmationModal,
    PromptInputModal,
  } = state;

  const openEditorFromQueryHandledRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!shouldOpenEditorFromQuery || !requestedFileId) {
      openEditorFromQueryHandledRef.current = null;
      return;
    }
    if (openEditorFromQueryHandledRef.current === requestedFileId) return;
    if (editingDocumentDraft?.id === requestedFileId) {
      openEditorFromQueryHandledRef.current = requestedFileId;
      return;
    }
    const fileExists = workspace.files.some((file) => file.id === requestedFileId);
    if (!fileExists) return;
    handleOpenFileEditor(requestedFileId);
    openEditorFromQueryHandledRef.current = requestedFileId;
  }, [
    editingDocumentDraft?.id,
    handleOpenFileEditor,
    requestedFileId,
    shouldOpenEditorFromQuery,
    workspace.files,
  ]);

  const [editorWidth, setEditorWidth] = React.useState<number | null>(null);
  const [editorDetailsTab, setEditorDetailsTab] = React.useState<'document' | 'metadata' | 'history'>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = React.useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = React.useState(0);
  const editorSplitRef = React.useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scanDraftUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isScanDraftDropActive, setIsScanDraftDropActive] = React.useState(false);
  const initialDraftFingerprintRef = React.useRef<string | null>(null);

  const preserveWorkspaceView = useCallback(
    (view: 'document' | 'relations'): void => {
      window.setTimeout((): void => {
        setWorkspaceView((current) => (current === view ? current : view));
      }, 0);
    },
    []
  );

  const buildDraftFingerprint = useCallback((input: typeof editingDocumentDraft): string => {
    if (!input) return '';
    return JSON.stringify({
      id: input.id,
      name: input.name,
      activeDocumentVersion: input.activeDocumentVersion,
      editorType: input.editorType,
      documentContent: input.documentContent,
      documentContentMarkdown: input.documentContentMarkdown,
      documentContentHtml: input.documentContentHtml,
      documentDate: input.documentDate,
      addresser: input.addresser,
      addressee: input.addressee,
      referenceCaseIds: input.referenceCaseIds,
      tagId: input.tagId,
      caseIdentifierId: input.caseIdentifierId,
      categoryId: input.categoryId,
    });
  }, []);

  React.useEffect(() => {
    if (!editingDocumentDraft) {
      initialDraftFingerprintRef.current = null;
      return;
    }
    initialDraftFingerprintRef.current = buildDraftFingerprint(editingDocumentDraft);
    setEditorWidth(null);
    setEditorDetailsTab('document');
    setEditorContentRevisionSeed((value) => value + 1);
  }, [buildDraftFingerprint, editingDocumentDraft?.id]);

  const isEditorDraftDirty = React.useMemo(() => {
    if (!editingDocumentDraft) return false;
    if (!initialDraftFingerprintRef.current) return false;
    return buildDraftFingerprint(editingDocumentDraft) !== initialDraftFingerprintRef.current;
  }, [buildDraftFingerprint, editingDocumentDraft]);

  const caseTagPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = React.useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  const caseTagOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverTags.length > 0 ? 'No tag' : 'No tags' },
      ...caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.name,
      })),
    ],
    [caseResolverTags, caseTagPathById]
  );
  const caseIdentifierOptions = React.useMemo(
    () => [
      {
        value: '__none__',
        label: caseResolverIdentifiers.length > 0 ? 'No case identifier' : 'No case identifiers',
      },
      ...caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.name,
      })),
    ],
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  const caseCategoryOptions = React.useMemo(
    () => [
      { value: '__none__', label: caseResolverCategories.length > 0 ? 'No category' : 'No categories' },
      ...caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    ],
    [caseCategoryPathById, caseResolverCategories]
  );
  const caseReferenceOptions = React.useMemo(
    () =>
      workspace.files
        .filter((file) => file.fileType === 'case')
        .map((file) => ({
          value: file.id,
          label: file.folder ? `${file.name} (${file.folder})` : file.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [workspace.files]
  );
  const parentCaseOptions = React.useMemo(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
  );
  const partyOptions = React.useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );
  const [promptExploderProposalDraft, setPromptExploderProposalDraft] =
    React.useState<CaseResolverCaptureProposalState | null>(null);
  const captureProposalTargetFileName = React.useMemo(() => {
    if (!promptExploderProposalDraft) return null;
    const targetFile = workspace.files.find(
      (file) => file.id === promptExploderProposalDraft.targetFileId
    );
    return targetFile?.name ?? promptExploderProposalDraft.targetFileId;
  }, [promptExploderProposalDraft, workspace.files]);

  React.useEffect(() => {
    if (!isPromptExploderPartyProposalOpen || !promptExploderPartyProposal) {
      setPromptExploderProposalDraft(null);
      return;
    }
    setPromptExploderProposalDraft({
      targetFileId: promptExploderPartyProposal.targetFileId,
      addresser: promptExploderPartyProposal.addresser
        ? {
          ...promptExploderPartyProposal.addresser,
          candidate: { ...promptExploderPartyProposal.addresser.candidate },
          existingReference: promptExploderPartyProposal.addresser.existingReference
            ? { ...promptExploderPartyProposal.addresser.existingReference }
            : null,
        }
        : null,
      addressee: promptExploderPartyProposal.addressee
        ? {
          ...promptExploderPartyProposal.addressee,
          candidate: { ...promptExploderPartyProposal.addressee.candidate },
          existingReference: promptExploderPartyProposal.addressee.existingReference
            ? { ...promptExploderPartyProposal.addressee.existingReference }
            : null,
        }
        : null,
    });
  }, [isPromptExploderPartyProposalOpen, promptExploderPartyProposal]);

  const handleClosePromptExploderProposalModal = useCallback((): void => {
    if (isApplyingPromptExploderPartyProposal) return;
    setIsPromptExploderPartyProposalOpen(false);
  }, [isApplyingPromptExploderPartyProposal, setIsPromptExploderPartyProposalOpen]);

  const updatePromptExploderProposalAction = useCallback(
    (role: 'addresser' | 'addressee', action: CaseResolverCaptureAction): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            action,
          },
        };
      });
    },
    []
  );

  const updatePromptExploderProposalReference = useCallback(
    (role: 'addresser' | 'addressee', encodedReference: string): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            existingReference: decodeFilemakerPartyReference(encodedReference),
          },
        };
      });
    },
    []
  );

  const handleApplyPromptExploderProposal = useCallback((): void => {
    if (!promptExploderProposalDraft) {
      setIsPromptExploderPartyProposalOpen(false);
      return;
    }

    setIsApplyingPromptExploderPartyProposal(true);
    try {
      const targetFileId = promptExploderProposalDraft.targetFileId;
      const addresserReference =
        promptExploderProposalDraft.addresser?.action === 'database'
          ? promptExploderProposalDraft.addresser.existingReference ?? null
          : undefined;
      const addresseeReference =
        promptExploderProposalDraft.addressee?.action === 'database'
          ? promptExploderProposalDraft.addressee.existingReference ?? null
          : undefined;
      const shouldPatchAddresser = addresserReference !== undefined;
      const shouldPatchAddressee = addresseeReference !== undefined;
      const shouldPersistPatch = shouldPatchAddresser || shouldPatchAddressee;

      if (shouldPersistPatch) {
        const now = new Date().toISOString();
        updateWorkspace((current) => ({
          ...current,
          files: current.files.map((file) => {
            if (file.id !== targetFileId) return file;
            return {
              ...file,
              ...(shouldPatchAddresser ? { addresser: addresserReference } : {}),
              ...(shouldPatchAddressee ? { addressee: addresseeReference } : {}),
              updatedAt: now,
            };
          }),
        }), { persistToast: 'Capture mapping applied.' });
        setEditingDocumentDraft((current) => {
          if (current?.id !== targetFileId) return current;
          return {
            ...current,
            ...(shouldPatchAddresser ? { addresser: addresserReference } : {}),
            ...(shouldPatchAddressee ? { addressee: addresseeReference } : {}),
          };
        });
      }

      setPromptExploderPartyProposal(promptExploderProposalDraft);
      setIsPromptExploderPartyProposalOpen(false);
      toast(
        shouldPersistPatch
          ? 'Capture mapping applied to document parties.'
          : 'No database mapping selected. Document parties were not changed.',
        { variant: shouldPersistPatch ? 'success' : 'info' }
      );
    } finally {
      setIsApplyingPromptExploderPartyProposal(false);
    }
  }, [
    promptExploderProposalDraft,
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderPartyProposal,
    toast,
    updateWorkspace,
  ]);

  const updateEditingDocumentDraft = useCallback(
    (patch: Partial<CaseResolverFileEditDraft>): void => {
      setEditingDocumentDraft((current) => (current ? { ...current, ...patch } : current));
    },
    [setEditingDocumentDraft]
  );

  const handleOpenPromptExploderForDraft = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const promptSource = (
      editingDocumentDraft.documentContentMarkdown ||
      editingDocumentDraft.documentContent
    ).trim();
    if (!promptSource) {
      toast('Add document content before opening Prompt Exploder.', { variant: 'warning' });
      return;
    }

    savePromptExploderDraftPromptFromCaseResolver(promptSource, {
      fileId: editingDocumentDraft.id,
      fileName: editingDocumentDraft.name.trim() || editingDocumentDraft.id,
    });
    const returnTo = `/admin/case-resolver?openEditor=1&fileId=${encodeURIComponent(
      editingDocumentDraft.id
    )}`;
    router.push(`/admin/prompt-exploder?returnTo=${encodeURIComponent(returnTo)}`);
  }, [editingDocumentDraft, router, toast]);

  const handleCopyDraftFileId = useCallback(async (): Promise<void> => {
    if (!editingDocumentDraft) return;
    try {
      await navigator.clipboard.writeText(editingDocumentDraft.id);
      toast('File ID copied to clipboard.', { variant: 'success' });
    } catch {
      toast('Failed to copy file ID.', { variant: 'error' });
    }
  }, [editingDocumentDraft, toast]);

  const handleTriggerScanDraftUpload = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    if (isUploadingScanDraftFiles) return;
    scanDraftUploadInputRef.current?.click();
  }, [editingDocumentDraft, isUploadingScanDraftFiles]);

  const uploadScanDraftFiles = useCallback(
    (files: File[]): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (files.length === 0) return;
      void handleUploadScanFiles(editingDocumentDraft.id, files).catch((error: unknown) => {
        toast(
          error instanceof Error ? error.message : 'Failed to upload scan images.',
          { variant: 'error' }
        );
      });
    },
    [editingDocumentDraft, handleUploadScanFiles, toast]
  );

  const handleScanDraftUploadInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      uploadScanDraftFiles(files);
    },
    [uploadScanDraftFiles]
  );

  const handleRunScanDraftOcr = useCallback((): void => {
    if (editingDocumentDraft?.fileType !== 'scanfile') return;
    void handleRunScanFileOcr(editingDocumentDraft.id).catch((error: unknown) => {
      toast(
        error instanceof Error ? error.message : 'Failed to run OCR.',
        { variant: 'error' }
      );
    });
  }, [editingDocumentDraft, handleRunScanFileOcr, toast]);

  const handleScanDraftDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsScanDraftDropActive(false);
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      if (isUploadingScanDraftFiles) return;
      const files = Array.from(event.dataTransfer.files ?? []);
      uploadScanDraftFiles(files);
    },
    [editingDocumentDraft, isUploadingScanDraftFiles, uploadScanDraftFiles]
  );

  const handleScanDraftDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      const hasFiles = Array.from(event.dataTransfer.types ?? []).includes('Files');
      if (!hasFiles) return;
      event.preventDefault();
      setIsScanDraftDropActive(true);
    },
    [editingDocumentDraft]
  );

  const handleScanDraftDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (editingDocumentDraft?.fileType !== 'scanfile') return;
      const hasFiles = Array.from(event.dataTransfer.types ?? []).includes('Files');
      if (!hasFiles) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsScanDraftDropActive(true);
    },
    [editingDocumentDraft]
  );

  const handleScanDraftDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsScanDraftDropActive(false);
  }, []);

  const applyDraftCanonicalContent = useCallback(
    (input: {
      mode: 'markdown' | 'wysiwyg' | 'code';
      value: string;
      markdown?: string | undefined;
      html?: string | undefined;
      warnings?: string[] | undefined;
    }): void => {
      setEditingDocumentDraft((current) => {
        if (!current) return current;
        const canonical = deriveDocumentContentSync({
          mode: input.mode,
          value: input.value,
          previousMarkdown: input.markdown ?? current.documentContentMarkdown,
          previousHtml: input.html ?? current.documentContentHtml,
        });
        const mergedWarnings = input.warnings
          ? Array.from(new Set([...canonical.warnings, ...input.warnings]))
          : canonical.warnings;
        const nextStoredContent = toStorageDocumentValue(canonical);
        const now = new Date().toISOString();
        return {
          ...current,
          editorType: canonical.mode,
          documentContentFormatVersion: 1,
          documentContent: nextStoredContent,
          documentContentMarkdown: canonical.markdown,
          documentContentHtml: canonical.html,
          documentContentPlainText: canonical.plainText,
          documentConversionWarnings: mergedWarnings,
          lastContentConversionAt: now,
        };
      });
    },
    [setEditingDocumentDraft]
  );

  const handleUpdateDraftDocumentContent = useCallback((next: string) => {
    if (!editingDocumentDraft) return;
    if (editingDocumentDraft.editorType === 'wysiwyg') {
      applyDraftCanonicalContent({
        mode: 'wysiwyg',
        value: next,
        html: next,
        markdown: editingDocumentDraft.documentContentMarkdown,
      });
      return;
    }
    applyDraftCanonicalContent({
      mode: editingDocumentDraft.editorType,
      value: next,
      markdown: next,
      html: editingDocumentDraft.documentContentHtml,
    });
  }, [applyDraftCanonicalContent, editingDocumentDraft]);

  const handleUseHistoryEntry = useCallback((entry: CaseResolverDocumentHistoryEntry): void => {
    if (!editingDocumentDraft) return;
    const nextMode = entry.editorType;
    applyDraftCanonicalContent({
      mode: nextMode,
      value: nextMode === 'wysiwyg' ? entry.documentContentHtml : entry.documentContentMarkdown,
      html: entry.documentContentHtml,
      markdown: entry.documentContentMarkdown,
    });
    updateEditingDocumentDraft({
      activeDocumentVersion: entry.activeDocumentVersion,
    });
    setEditorDetailsTab('document');
    toast('Revision loaded into the editor. Save to apply it.', { variant: 'info' });
  }, [
    applyDraftCanonicalContent,
    editingDocumentDraft,
    toast,
    updateEditingDocumentDraft,
  ]);

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      const normalizedSourceFolder = normalizeFolderPath(folderPath);
      if (!normalizedSourceFolder) return;
      const normalizedTargetFolder = normalizeFolderPath(targetFolder);
      const sourceFolderName = normalizedSourceFolder.includes('/')
        ? normalizedSourceFolder.slice(normalizedSourceFolder.lastIndexOf('/') + 1)
        : normalizedSourceFolder;
      const nextRootFolder = normalizeFolderPath(
        normalizedTargetFolder ? `${normalizedTargetFolder}/${sourceFolderName}` : sourceFolderName
      );
      if (!nextRootFolder || nextRootFolder === normalizedSourceFolder) {
        return;
      }

      updateWorkspace(
        (current) => {
          const now = new Date().toISOString();
          const renamePath = (value: string): string =>
            renameFolderPath(value, normalizedSourceFolder, nextRootFolder);

          const movedFolders = current.folders.map((folder: string): string => renamePath(folder));
          const movedFolderTimestamps = Object.fromEntries(
            Object.entries(current.folderTimestamps ?? {}).map(([path, timestamps]) => [
              renamePath(path),
              timestamps,
            ])
          );
          const movedFiles = current.files.map((file) => {
            const nextFolder = renamePath(file.folder);
            if (nextFolder === file.folder) return file;
            return {
              ...file,
              folder: nextFolder,
              updatedAt: now,
            };
          });
          const movedAssets = current.assets.map((asset) => {
            const nextFolder = renamePath(asset.folder);
            if (nextFolder === asset.folder) return asset;
            return {
              ...asset,
              folder: nextFolder,
              updatedAt: now,
            };
          });

          return {
            ...current,
            folders: normalizeFolderPaths(movedFolders),
            folderTimestamps: movedFolderTimestamps,
            files: movedFiles,
            assets: movedAssets,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );

      setSelectedFolderPath((current) => {
        if (!current || !isPathWithinFolder(current, normalizedSourceFolder)) {
          return current;
        }
        return renameFolderPath(current, normalizedSourceFolder, nextRootFolder);
      });
    },
    [setSelectedFolderPath, updateWorkspace]
  );

  const handleToggleFolderLock = useCallback(
    (folderPath: string): void => {
      const normalizedFolderPath = normalizeFolderPath(folderPath);
      if (!normalizedFolderPath) return;
      updateWorkspace(
        (current) => {
          const folderFiles = current.files.filter((file) =>
            isPathWithinFolder(file.folder, normalizedFolderPath)
          );
          if (folderFiles.length === 0) return current;

          const shouldLock = folderFiles.some((file) => !file.isLocked);
          const now = new Date().toISOString();
          let changed = false;
          const nextFiles = current.files.map((file) => {
            if (!isPathWithinFolder(file.folder, normalizedFolderPath)) return file;
            if (file.isLocked === shouldLock) return file;
            changed = true;
            return {
              ...file,
              isLocked: shouldLock,
              updatedAt: now,
            };
          });
          if (!changed) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
    },
    [updateWorkspace]
  );

  const handleToggleFileLock = useCallback(
    (fileId: string): void => {
      updateWorkspace(
        (current) => {
          const target = current.files.find((file) => file.id === fileId);
          if (!target) return current;
          const nextLocked = !target.isLocked;
          const now = new Date().toISOString();
          const nextFiles = current.files.map((file) =>
            file.id === fileId
              ? {
                ...file,
                isLocked: nextLocked,
                updatedAt: now,
              }
              : file
          );
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
    },
    [updateWorkspace]
  );

  const handleDeleteFile = useCallback(
    (fileId: string): void => {
      const target = workspace.files.find((file) => file.id === fileId);
      if (!target) return;
      const behavesAsCaseContainer =
        target.fileType === 'case' ||
        workspace.files.some((file) => file.parentCaseId === target.id);
      if (behavesAsCaseContainer) {
        toast('Cases cannot be removed from folder tree. Remove the case in Cases list.', {
          variant: 'warning',
        });
        return;
      }
      if (target.isLocked) {
        toast('Document is locked. Unlock it in Case Resolver before removing.', { variant: 'warning' });
        return;
      }

      const parentContainerId =
        target.parentCaseId &&
        workspace.files.some((file) => file.id === target.parentCaseId && file.fileType === 'case')
          ? target.parentCaseId
          : null;
      const viewBeforeDelete = workspaceView;
      const runDelete = (): void => {
        updateWorkspace(
          (current) => {
            const exists = current.files.some((file) => file.id === fileId);
            if (!exists) return current;
            const nextFiles = current.files.filter((file) => file.id !== fileId);
            return {
              ...current,
              files: nextFiles,
              activeFileId:
                current.activeFileId === fileId
                  ? (parentContainerId ?? nextFiles[0]?.id ?? null)
                  : current.activeFileId,
            };
          },
          { persistToast: 'Document removed.' }
        );
        if (selectedFileId === fileId) {
          setSelectedFileId(parentContainerId);
          setSelectedAssetId(null);
          setSelectedFolderPath(null);
        }
        if (editingDocumentDraft?.id === fileId) {
          setEditingDocumentDraft(null);
        }
        preserveWorkspaceView(viewBeforeDelete);
      };

      if (!caseResolverSettings.confirmDeleteDocument) {
        runDelete();
        return;
      }

      confirmAction({
        title: 'Delete Document?',
        message: `Are you sure you want to delete document "${target.name}"? This action cannot be undone.`,
        confirmText: 'Delete Document',
        isDangerous: true,
        onConfirm: runDelete,
      });
    },
    [
      caseResolverSettings.confirmDeleteDocument,
      confirmAction,
      editingDocumentDraft?.id,
      preserveWorkspaceView,
      selectedFileId,
      setEditingDocumentDraft,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      updateWorkspace,
      workspace.files,
      workspaceView,
    ]
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      updateWorkspace((current) => {
        if (!current.activeFileId) return current;
        const now = new Date().toISOString();
        let changed = false;
        const nextFiles = current.files.map((file) => {
          if (file.id !== current.activeFileId) return file;
          changed = true;
          return {
            ...file,
            graph: nextGraph,
            updatedAt: now,
          };
        });
        if (!changed) return current;
        return {
          ...current,
          files: nextFiles,
        };
      });
    },
    [updateWorkspace]
  );

  const handleRelationGraphChange = useCallback(
    (nextGraph: CaseResolverRelationGraph): void => {
      updateWorkspace((current) => {
        if (stableStringify(current.relationGraph) === stableStringify(nextGraph)) {
          return current;
        }
        return {
          ...current,
          relationGraph: nextGraph,
        };
      });
    },
    [updateWorkspace]
  );

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      activeFile,
      selectedAsset,
      panelCollapsed: folderPanelCollapsed,
      onPanelCollapsedChange: setFolderPanelCollapsed,
      onSelectFile: handleSelectFile,
      onSelectAsset: handleSelectAsset,
      onSelectFolder: handleSelectFolder,
      onCreateFile: handleCreateFile,
      onCreateFolder: handleCreateFolder,
      onDeleteFolder: handleDeleteFolder,
      onCreateScanFile: handleCreateScanFile,
      onCreateImageAsset: handleCreateImageAsset,
      onCreateNodeFile: () => { handleCreateFile(null); }, // Simplified
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
      onToggleFileLock: handleToggleFileLock,
      onEditFile: handleOpenFileEditor,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      onCreateDocumentFromSearch: () => { setActiveMainView('workspace'); handleCreateFile(null); },
      onOpenFileFromSearch: (id) => { setActiveMainView('workspace'); handleSelectFile(id); },
      onEditFileFromSearch: (id) => { setActiveMainView('workspace'); handleOpenFileEditor(id); },
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
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <h1 className='text-2xl font-bold text-white'>Case Resolver</h1>
                <nav
                  aria-label='Breadcrumb'
                  className='mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400'
                >
                  <Link href='/admin' className='transition-colors hover:text-gray-200'>
                    Admin
                  </Link>
                  <span>/</span>
                  <span className='text-gray-300'>Case Resolver</span>
                </nav>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant={workspaceView === 'document' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setWorkspaceView('document')}
                >
                  Document Canvas
                </Button>
                <Button
                  variant={workspaceView === 'relations' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setWorkspaceView('relations')}
                >
                  Relations Canvas
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => {
                    if (!activeFile) return;
                    handleOpenFileEditor(activeFile.id);
                  }}
                  disabled={Boolean(selectedAsset) || !activeFile || activeFile.fileType === 'case'}
                >
                  Parties & References
                </Button>
              </div>
            </div>

            {workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace />
            ) : selectedAsset ? (
              <CaseResolverFileViewer />
            ) : activeFile ? (
              <CaseResolverCanvasWorkspace />
            ) : (
              <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border'>
                <div className='text-center'>
                  <FileText className='mx-auto mb-4 size-12 text-gray-600' />
                  <h3 className='text-lg font-medium text-gray-300'>No case selected</h3>
                  <p className='text-sm text-gray-500'>Select a file from the tree to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => { if (!open) handleSaveFileEditor(); }}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan' : 'Edit Document'}
          size='xl'
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='font-mono text-[11px] text-gray-400'>
                    File ID: {editingDocumentDraft.id}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    Folder: {editingDocumentDraft.folder || '(root)'}
                  </div>
                </div>
              </div>

              {editingDocumentDraft.fileType === 'scanfile' ? (
                <div
                  className={`rounded border px-3 py-3 transition ${
                    isScanDraftDropActive
                      ? 'border-cyan-500/70 bg-cyan-500/10'
                      : 'border-border/60 bg-card/30'
                  }`}
                  onDragEnter={handleScanDraftDragEnter}
                  onDragOver={handleScanDraftDragOver}
                  onDragLeave={handleScanDraftDragLeave}
                  onDrop={handleScanDraftDrop}
                >
                  <input
                    ref={scanDraftUploadInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={handleScanDraftUploadInputChange}
                  />
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='text-xs font-medium text-gray-200'>Image Slots</div>
                    <div className='ml-auto flex items-center gap-2'>
                      <Button
                        type='button'
                        onClick={handleTriggerScanDraftUpload}
                        disabled={isUploadingScanDraftFiles}
                        className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60 disabled:opacity-60'
                      >
                        {isUploadingScanDraftFiles ? 'Uploading...' : 'Upload Images'}
                      </Button>
                      <Button
                        type='button'
                        onClick={handleRunScanDraftOcr}
                        disabled={
                          editingDocumentDraft.scanSlots.length === 0 ||
                          isUploadingScanDraftFiles ||
                          uploadingScanSlotId !== null
                        }
                        className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60'
                      >
                        {uploadingScanSlotId !== null ? 'Running OCR...' : 'Run OCR'}
                      </Button>
                    </div>
                  </div>
                  <div className='mt-1 text-[11px] text-gray-500'>
                    Drag and drop image files here, or use Upload Images.
                  </div>
                  <div className='mt-2 max-h-32 space-y-1 overflow-auto pr-1'>
                    {editingDocumentDraft.scanSlots.length === 0 ? (
                      <div className='rounded border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-gray-500'>
                        No images uploaded yet.
                      </div>
                    ) : (
                      editingDocumentDraft.scanSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-2 py-1.5 text-[11px]'
                        >
                          <div className='min-w-0'>
                            <div className='truncate text-gray-200'>{slot.name || 'Untitled image'}</div>
                            <div className='text-gray-500'>
                              {uploadingScanSlotId === 'all' || uploadingScanSlotId === slot.id
                                ? 'Processing OCR...'
                                : slot.ocrText.trim().length > 0
                                  ? 'OCR extracted'
                                  : 'OCR pending'}
                            </div>
                          </div>
                          {slot.filepath ? (
                            <a
                              href={slot.filepath}
                              target='_blank'
                              rel='noreferrer'
                              className='text-cyan-200 hover:text-cyan-100'
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <Tabs
                value={editorDetailsTab}
                onValueChange={(value: string): void => {
                  if (value === 'document' || value === 'metadata' || value === 'history') {
                    setEditorDetailsTab(value);
                  }
                }}
                className='space-y-3'
              >
                <TabsList className='h-9'>
                  <TabsTrigger value='document' className='text-xs'>Document</TabsTrigger>
                  <TabsTrigger value='metadata' className='text-xs'>Case Metadata</TabsTrigger>
                  <TabsTrigger value='history' className='text-xs'>History</TabsTrigger>
                </TabsList>

                <TabsContent value='document' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Name</Label>
                      <Input
                        value={editingDocumentDraft.name}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ name: event.target.value });
                        }}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Document Date</Label>
                      <Input
                        type='date'
                        value={editingDocumentDraft.documentDate}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ documentDate: event.target.value });
                        }}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Addresser</Label>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            addresser: decodeFilemakerPartyReference(value),
                          });
                        }}
                        options={partyOptions}
                        placeholder='Select addresser'
                        triggerClassName='h-9'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Addressee</Label>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            addressee: decodeFilemakerPartyReference(value),
                          });
                        }}
                        options={partyOptions}
                        placeholder='Select addressee'
                        triggerClassName='h-9'
                      />
                    </div>

                  </div>
                </TabsContent>

                <TabsContent value='metadata' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='md:col-span-2'>
                      <Label className='mb-2 block text-xs text-gray-400'>Reference Cases</Label>
                      <MultiSelect
                        options={caseReferenceOptions.filter(
                          (option) => option.value !== editingDocumentDraft.id
                        )}
                        selected={editingDocumentDraft.referenceCaseIds.filter(
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
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Parent Case</Label>
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
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Tag</Label>
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
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Case Identifier</Label>
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
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Category</Label>
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
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value='history' className='mt-0'>
                  {editingDocumentDraft.documentHistory.length === 0 ? (
                    <div className='rounded border border-dashed border-border/60 px-3 py-3 text-xs text-gray-500'>
                      No saved versions yet. Once you save an overwrite, the previous text will appear here.
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {editingDocumentDraft.documentHistory.map((entry: CaseResolverDocumentHistoryEntry) => (
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
                </TabsContent>
              </Tabs>

              <div className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs'>
                <span className='text-gray-400'>
                  Revision {editingDocumentDraft.baseDocumentContentVersion}
                  {isEditorDraftDirty ? ' · unsaved changes' : ' · saved'}
                </span>
                {editingDocumentDraft.documentConversionWarnings.length > 0 ? (
                  <span className='text-amber-300'>
                    {editingDocumentDraft.documentConversionWarnings[0]}
                  </span>
                ) : null}
              </div>

              <div className='flex justify-end gap-2'>
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
              </div>

              {ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR ? (
                <>
                  {editingDocumentDraft.editorType === 'wysiwyg' ? (
                    <DocumentWysiwygEditor
                      key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentHtml}
                      onChange={handleUpdateDraftDocumentContent}
                      allowFontFamily
                      allowTextAlign
                      surfaceClassName='min-h-[300px]'
                      editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                    />
                  ) : (
                    <MarkdownSplitEditor
                      key={`case-resolver-markdown-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentMarkdown}
                      onChange={handleUpdateDraftDocumentContent}
                      showPreview
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
                  value={editingDocumentDraft.documentContentHtml}
                  onChange={handleUpdateDraftDocumentContent}
                  allowFontFamily
                  allowTextAlign
                  surfaceClassName='min-h-[300px]'
                  editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                />
              )}

              <div className='flex justify-end gap-2'>
                <Button variant='outline' onClick={handleDiscardFileEditorDraft}>Discard</Button>
                <Button onClick={handleSaveFileEditor}>
                  Save Changes
                </Button>
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

        <AppModal
          open={isPromptExploderPartyProposalOpen && promptExploderProposalDraft !== null}
          onOpenChange={(open) => {
            if (!open) {
              handleClosePromptExploderProposalModal();
            }
          }}
          title='Prompt Exploder Capture Mapping'
          subtitle='Review and edit addresser/addressee mapping before it updates this document.'
          size='lg'
          bodyClassName='h-auto max-h-[78vh]'
          footer={(
            <>
              <Button
                type='button'
                variant='outline'
                onClick={handleClosePromptExploderProposalModal}
                disabled={isApplyingPromptExploderPartyProposal}
              >
                Close
              </Button>
              <Button
                type='button'
                onClick={handleApplyPromptExploderProposal}
                disabled={!promptExploderProposalDraft || isApplyingPromptExploderPartyProposal}
              >
                {isApplyingPromptExploderPartyProposal ? 'Applying...' : 'Apply Mapping'}
              </Button>
            </>
          )}
        >
          {promptExploderProposalDraft ? (
            <div className='space-y-4'>
              <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                Target File: <span className='font-medium text-gray-100'>{captureProposalTargetFileName}</span>
              </div>

              {(['addresser', 'addressee'] as const).map((role) => {
                const proposal = promptExploderProposalDraft[role];
                const roleLabel = role === 'addresser' ? 'Addresser' : 'Addressee';
                if (!proposal) {
                  return (
                    <div
                      key={role}
                      className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-3 text-sm text-gray-400'
                    >
                      No captured {roleLabel.toLowerCase()} candidate in this Prompt Exploder payload.
                    </div>
                  );
                }

                const matchedPartyLabel = proposal.existingReference
                  ? (
                    resolveFilemakerPartyLabel(filemakerDatabase, proposal.existingReference) ??
                    `${proposal.existingReference.kind}:${proposal.existingReference.id}`
                  )
                  : 'None';

                return (
                  <div key={role} className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='text-sm font-semibold text-gray-100'>{roleLabel}</div>
                      <div className='text-[11px] text-gray-400'>
                        Source role: {proposal.sourceRole}
                      </div>
                    </div>

                    <div className='rounded border border-border/60 bg-card/30 p-2'>
                      <div className='text-[11px] uppercase tracking-wide text-gray-500'>
                        Captured Text
                      </div>
                      <div className='mt-1 whitespace-pre-wrap text-xs text-gray-200'>
                        {proposal.candidate.rawText || proposal.candidate.displayName || 'No captured text.'}
                      </div>
                    </div>

                    <div className='grid gap-3 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label className='text-xs text-gray-400'>Action</Label>
                        <SelectSimple
                          size='sm'
                          value={proposal.action}
                          onValueChange={(value: string): void => {
                            if (
                              value === 'database' ||
                              value === 'text' ||
                              value === 'ignore'
                            ) {
                              updatePromptExploderProposalAction(role, value);
                            }
                          }}
                          options={CASE_RESOLVER_CAPTURE_ACTION_OPTIONS}
                          triggerClassName='h-9'
                        />
                      </div>

                      {proposal.action === 'database' ? (
                        <div className='space-y-2'>
                          <Label className='text-xs text-gray-400'>Database Party</Label>
                          <SelectSimple
                            size='sm'
                            value={encodeFilemakerPartyReference(proposal.existingReference)}
                            onValueChange={(value: string): void => {
                              updatePromptExploderProposalReference(role, value);
                            }}
                            options={partyOptions}
                            triggerClassName='h-9'
                          />
                        </div>
                      ) : (
                        <div className='space-y-2'>
                          <Label className='text-xs text-gray-400'>Matched Party</Label>
                          <div className='h-9 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                            {matchedPartyLabel}
                          </div>
                        </div>
                      )}
                    </div>

                    {proposal.existingAddressId ? (
                      <div className='text-[11px] text-gray-500'>
                        Matched address ID: {proposal.existingAddressId}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </AppModal>
        
        <ConfirmationModal />
        <PromptInputModal />
      </div>
    </CaseResolverPageProvider>
  );
}
