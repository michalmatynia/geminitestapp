'use client';

import { Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
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

import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  normalizeFolderPath,
  normalizeFolderPaths,
  renameFolderPath,
} from '../settings';
import { isPathWithinFolder } from '../utils/caseResolverUtils';

import type {
  CaseResolverCategory,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
} from '../types';

const ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_MULTIFORMAT_EDITOR'] !== 'false';

const buildPathLabelMap = <T extends { id: string; name: string; parentId: string | null }>(
  items: T[]
): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item: T): [string, T] => [item.id, item]));
  const cache = new Map<string, string>();

  const resolveLabel = (id: string, visited: Set<string>): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const item = byId.get(id);
    if (!item) return '';
    if (visited.has(id)) {
      cache.set(id, item.name);
      return item.name;
    }
    if (!item.parentId || !byId.has(item.parentId)) {
      cache.set(id, item.name);
      return item.name;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const parentLabel = resolveLabel(item.parentId, nextVisited);
    const label = `${parentLabel} / ${item.name}`;
    cache.set(id, label);
    return label;
  };

  items.forEach((item: T): void => {
    resolveLabel(item.id, new Set<string>());
  });

  return cache;
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
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    filemakerDatabase,
    requestedFileId,
    shouldOpenEditorFromQuery,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    updateWorkspace,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    ConfirmationModal,
    PromptInputModal,
  } = state;

  React.useEffect(() => {
    if (!activeFile && workspaceView === 'document') {
      setWorkspaceView('relations');
    }
  }, [activeFile, workspaceView]);

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
  const [editorDetailsTab, setEditorDetailsTab] = React.useState<'document' | 'metadata'>('document');
  const [isDraggingSplitter, setIsDraggingSplitter] = React.useState(false);
  const [editorContentRevisionSeed, setEditorContentRevisionSeed] = React.useState(0);
  const editorSplitRef = React.useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const initialDraftFingerprintRef = React.useRef<string | null>(null);

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
                ? (nextFiles[0]?.id ?? null)
                : current.activeFileId,
          };
        },
        { persistToast: 'Case removed.' }
      );
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setSelectedAssetId(null);
        setSelectedFolderPath(null);
      }
      if (editingDocumentDraft?.id === fileId) {
        setEditingDocumentDraft(null);
      }
    },
    [
      editingDocumentDraft?.id,
      selectedFileId,
      setEditingDocumentDraft,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      updateWorkspace,
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
      onCreateScanFile: () => { handleCreateFile(null); }, // Simplified
      onCreateNodeFile: () => { handleCreateFile(null); }, // Simplified
      onUploadAssets: async () => [], // Simplified
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
      onUpdateSelectedAsset: () => {},
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
                  disabled={!activeFile}
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
                  disabled={!activeFile}
                >
                  Parties & References
                </Button>
              </div>
            </div>

            {workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace />
            ) : activeFile ? (
              activeFile.fileType === 'scanfile' ? (
                <div className='rounded-lg border border-border p-6 bg-card/10'>
                  <h2 className='text-xl font-semibold mb-4'>Scan Workspace: {activeFile.name}</h2>
                  <Button onClick={() => handleOpenFileEditor(activeFile.id)}>Open Scan Editor</Button>
                </div>
              ) : (
                <CaseResolverCanvasWorkspace />
              )
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

              <Tabs
                value={editorDetailsTab}
                onValueChange={(value: string): void => {
                  if (value === 'document' || value === 'metadata') {
                    setEditorDetailsTab(value);
                  }
                }}
                className='space-y-3'
              >
                <TabsList className='h-9'>
                  <TabsTrigger value='document' className='text-xs'>Document</TabsTrigger>
                  <TabsTrigger value='metadata' className='text-xs'>Case Metadata</TabsTrigger>
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
