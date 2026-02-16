'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  buildCaseResolverCaptureProposalState,
  stripCapturedAddressLinesFromText,
  type CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
} from '@/features/case-resolver-capture/settings';
import {
  deriveDocumentContentSync,
  normalizeRawDocumentModeFromContent,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker/settings';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import {
  consumePromptExploderApplyPromptForCaseResolver,
} from '@/features/prompt-exploder/bridge';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  extractCaseResolverDocumentDate,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  buildFileEditDraft,
  createId,
  createUniqueFolderPath,
  isPathWithinFolder,
  promptForName,
} from '../utils/caseResolverUtils';

import type {
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';
const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';

type StoredCaseResolverEditorDraft = {
  fileId: string;
  baseDocumentContentVersion: number;
  updatedAt: string;
  draft: CaseResolverFileEditDraft;
};

const buildEditorDraftStorageKey = (fileId: string): string =>
  `${CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX}:${fileId}`;

const readStoredEditorDraft = (fileId: string): StoredCaseResolverEditorDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(buildEditorDraftStorageKey(fileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCaseResolverEditorDraft | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.fileId !== fileId) return null;
    if (!parsed.draft || typeof parsed.draft !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredEditorDraft = (fileId: string, draft: CaseResolverFileEditDraft): void => {
  if (typeof window === 'undefined') return;
  const payload: StoredCaseResolverEditorDraft = {
    fileId,
    baseDocumentContentVersion: draft.baseDocumentContentVersion,
    updatedAt: new Date().toISOString(),
    draft,
  };
  window.localStorage.setItem(buildEditorDraftStorageKey(fileId), JSON.stringify(payload));
};

const clearStoredEditorDraft = (fileId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(buildEditorDraftStorageKey(fileId));
};

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState() {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCaseResolverCaptureSettings = settingsStore.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY);
  
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverIdentifiers = useMemo(
    (): CaseResolverIdentifier[] => parseCaseResolverIdentifiers(rawCaseResolverIdentifiers),
    [rawCaseResolverIdentifiers]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  const caseResolverCaptureSettings = useMemo(
    () => parseCaseResolverCaptureSettings(rawCaseResolverCaptureSettings),
    [rawCaseResolverCaptureSettings]
  );
  
  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(parsedWorkspace.activeFileId);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);

  const [promptExploderPartyProposal, setPromptExploderPartyProposal] = useState<CaseResolverCaptureProposalState | null>(null);
  const [isPromptExploderPartyProposalOpen, setIsPromptExploderPartyProposalOpen] = useState(false);
  const [isApplyingPromptExploderPartyProposal, setIsApplyingPromptExploderPartyProposal] = useState(false);

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const lastPersistedValueRef = useRef<string>(JSON.stringify(parsedWorkspace));
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);

  const flushWorkspacePersist = useCallback((): void => {
    if (persistWorkspaceInFlightRef.current) return;
    const nextSerialized = queuedSerializedWorkspaceRef.current;
    if (!nextSerialized || nextSerialized === lastPersistedValueRef.current) return;

    persistWorkspaceInFlightRef.current = true;
    void updateSetting.mutateAsync({
      key: CASE_RESOLVER_WORKSPACE_KEY,
      value: nextSerialized,
    }).then(() => {
      lastPersistedValueRef.current = nextSerialized;
      if (queuedSerializedWorkspaceRef.current === nextSerialized) {
        queuedSerializedWorkspaceRef.current = null;
      }
      if (pendingSaveToastRef.current) {
        toast(pendingSaveToastRef.current, { variant: 'success' });
        pendingSaveToastRef.current = null;
      }
    }).catch(() => {
      toast('Failed to save Case Resolver workspace.', { variant: 'error' });
    }).finally(() => {
      persistWorkspaceInFlightRef.current = false;
      if (
        queuedSerializedWorkspaceRef.current &&
        queuedSerializedWorkspaceRef.current !== lastPersistedValueRef.current
      ) {
        flushWorkspacePersist();
      }
    });
  }, [toast, updateSetting]);

  // Sync with store
  useEffect(() => {
    setWorkspace(parsedWorkspace);
    lastPersistedValueRef.current = JSON.stringify(parsedWorkspace);
    queuedSerializedWorkspaceRef.current = null;
  }, [parsedWorkspace]);

  // Handle auto-save
  useEffect(() => {
    const serialized = JSON.stringify(workspace);
    if (serialized === lastPersistedValueRef.current) return;
    queuedSerializedWorkspaceRef.current = serialized;

    if (persistWorkspaceTimerRef.current) {
      window.clearTimeout(persistWorkspaceTimerRef.current);
      persistWorkspaceTimerRef.current = null;
    }

    persistWorkspaceTimerRef.current = window.setTimeout(() => {
      persistWorkspaceTimerRef.current = null;
      flushWorkspacePersist();
    }, 350);
  }, [flushWorkspacePersist, workspace]);

  useEffect(() => {
    return (): void => {
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
    };
  }, []);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: { persistToast?: string }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const updated = updater(current);
        if (updated === current) return current;
        if (options?.persistToast) pendingSaveToastRef.current = options.persistToast;
        return normalizeCaseResolverWorkspace(updated);
      });
    },
    []
  );

  const handleSelectFile = useCallback((fileId: string): void => {
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }
    setSelectedFileId(fileId);
    updateWorkspace((current) => ({ ...current, activeFileId: fileId }));
    setSelectedFolderPath(null);
    setSelectedAssetId(null);
  }, [selectedFileId, updateWorkspace]);

  const handleSelectAsset = useCallback((assetId: string): void => {
    setSelectedFileId(null);
    setSelectedAssetId(assetId);
    setSelectedFolderPath(null);
  }, []);

  const handleSelectFolder = useCallback((folderPath: string | null): void => {
    if (folderPath !== null && selectedFolderPath === folderPath) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }
    setSelectedFileId(null);
    setSelectedFolderPath(folderPath);
    setSelectedAssetId(null);
  }, [selectedFolderPath]);

  const handleCreateFolder = useCallback((targetFolderPath: string | null): void => {
    let createdPath: string | null = null;
    updateWorkspace((current) => {
      const nextPath = createUniqueFolderPath(current.folders, targetFolderPath);
      createdPath = nextPath;
      if (current.folders.includes(nextPath)) return current;
      return { ...current, folders: normalizeFolderPaths([...current.folders, nextPath]) };
    }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    if (createdPath) {
      setSelectedFileId(null);
      setSelectedAssetId(null);
      setSelectedFolderPath(createdPath);
    }
  }, [updateWorkspace]);

  const handleCreateFile = useCallback((targetFolderPath: string | null): void => {
    const fileName = promptForName('Case name', 'New Case');
    if (!fileName) return;
    const folder = normalizeFolderPath(targetFolderPath ?? '');
    const file = createCaseResolverFile({
      id: createId('case-file'),
      fileType: 'document',
      name: fileName,
      folder,
      tagId: defaultTagId,
      caseIdentifierId: defaultCaseIdentifierId,
      categoryId: defaultCategoryId,
    });
    updateWorkspace((current) => ({
      ...current,
      files: [...current.files, file],
      activeFileId: file.id,
      folders: normalizeFolderPaths([...current.folders, folder]),
    }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    setSelectedFileId(file.id);
    setSelectedFolderPath(null);
    setSelectedAssetId(null);
  }, [defaultCaseIdentifierId, defaultCategoryId, defaultTagId, updateWorkspace]);

  const handleDeleteFolder = useCallback((folderPath: string): void => {
    const normalizedFolder = normalizeFolderPath(folderPath);
    if (!normalizedFolder) return;
    
    if (typeof window !== 'undefined' && !window.confirm(`Delete folder "${normalizedFolder}" and all nested content?`)) {
      return;
    }

    updateWorkspace((current) => {
      const currentRemovedFileIds = new Set(
        current.files
          .filter((file) => isPathWithinFolder(file.folder, normalizedFolder))
          .map((file) => file.id)
      );
      const nextFiles = current.files.filter((file) => !isPathWithinFolder(file.folder, normalizedFolder));
      
      return {
        ...current,
        folders: current.folders.filter((path) => !isPathWithinFolder(path, normalizedFolder)),
        files: nextFiles,
        assets: current.assets.filter((asset) => !isPathWithinFolder(asset.folder, normalizedFolder)),
        activeFileId: current.activeFileId && currentRemovedFileIds.has(current.activeFileId)
          ? (nextFiles[0]?.id ?? null)
          : current.activeFileId,
      };
    }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
  }, [updateWorkspace]);

  const handleOpenFileEditor = useCallback((fileId: string): void => {
    const target = workspace.files.find((file) => file.id === fileId);
    if (!target) {
      toast('File not found.', { variant: 'warning' });
      return;
    }
    const baseDraft = buildFileEditDraft(target);
    const recoveredDraft = readStoredEditorDraft(fileId);
    const canRecoverStoredDraft =
      recoveredDraft?.baseDocumentContentVersion === baseDraft.baseDocumentContentVersion;
    const nextDraft = canRecoverStoredDraft ? recoveredDraft.draft : baseDraft;
    if (canRecoverStoredDraft) {
      toast('Recovered unsaved draft from local storage.', { variant: 'info' });
    } else if (recoveredDraft) {
      clearStoredEditorDraft(fileId);
    }
    setEditingDocumentDraft(nextDraft);
    setSelectedFileId(fileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    updateWorkspace((current) => ({ ...current, activeFileId: fileId }));
  }, [workspace.files, updateWorkspace, toast]);

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

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const currentFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === editingDocumentDraft.id
    );
    if (!currentFile) {
      toast('Document no longer exists. Please refresh list.', { variant: 'warning' });
      return;
    }
    if (currentFile.documentContentVersion !== editingDocumentDraft.baseDocumentContentVersion) {
      toast('Document changed elsewhere. Reopen editor to merge latest version.', {
        variant: 'warning',
      });
      return;
    }
    const resolvedMode = normalizeRawDocumentModeFromContent({
      mode: editingDocumentDraft.editorType,
      rawContent: editingDocumentDraft.documentContent,
      rawMarkdown: editingDocumentDraft.documentContentMarkdown,
      rawHtml: editingDocumentDraft.documentContentHtml,
    });
    const canonical = deriveDocumentContentSync({
      mode: resolvedMode,
      value: resolvedMode === 'wysiwyg'
        ? editingDocumentDraft.documentContentHtml
        : editingDocumentDraft.documentContentMarkdown,
      previousHtml: editingDocumentDraft.documentContentHtml,
      previousMarkdown: editingDocumentDraft.documentContentMarkdown,
    });
    const nextStoredContent = toStorageDocumentValue(canonical);
    const nextOriginalDocumentContent =
      editingDocumentDraft.activeDocumentVersion === 'original'
        ? nextStoredContent
        : editingDocumentDraft.originalDocumentContent;
    const nextExplodedDocumentContent =
      editingDocumentDraft.activeDocumentVersion === 'exploded'
        ? nextStoredContent
        : editingDocumentDraft.explodedDocumentContent;
    const hasMeaningfulChanges =
      currentFile.name !== editingDocumentDraft.name ||
      currentFile.folder !== editingDocumentDraft.folder ||
      currentFile.parentCaseId !== editingDocumentDraft.parentCaseId ||
      JSON.stringify(currentFile.referenceCaseIds) !== JSON.stringify(editingDocumentDraft.referenceCaseIds) ||
      currentFile.documentDate !== editingDocumentDraft.documentDate ||
      currentFile.tagId !== editingDocumentDraft.tagId ||
      currentFile.caseIdentifierId !== editingDocumentDraft.caseIdentifierId ||
      currentFile.categoryId !== editingDocumentDraft.categoryId ||
      JSON.stringify(currentFile.addresser) !== JSON.stringify(editingDocumentDraft.addresser) ||
      JSON.stringify(currentFile.addressee) !== JSON.stringify(editingDocumentDraft.addressee) ||
      currentFile.activeDocumentVersion !== editingDocumentDraft.activeDocumentVersion ||
      currentFile.editorType !== canonical.mode ||
      currentFile.documentContent !== nextStoredContent ||
      currentFile.documentContentMarkdown !== canonical.markdown ||
      currentFile.documentContentHtml !== canonical.html ||
      currentFile.documentContentPlainText !== canonical.plainText ||
      JSON.stringify(currentFile.documentConversionWarnings) !== JSON.stringify(canonical.warnings) ||
      currentFile.originalDocumentContent !== nextOriginalDocumentContent ||
      currentFile.explodedDocumentContent !== nextExplodedDocumentContent;

    if (!hasMeaningfulChanges) {
      clearStoredEditorDraft(editingDocumentDraft.id);
      setEditingDocumentDraft(null);
      return;
    }
    const now = new Date().toISOString();
    updateWorkspace((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === editingDocumentDraft.id
          ? {
            ...file,
            ...editingDocumentDraft,
            editorType: canonical.mode,
            documentContentFormatVersion: 1,
            documentContentVersion: file.documentContentVersion + 1,
            documentContent: nextStoredContent,
            documentContentMarkdown: canonical.markdown,
            documentContentHtml: canonical.html,
            documentContentPlainText: canonical.plainText,
            documentConversionWarnings: canonical.warnings,
            lastContentConversionAt: now,
            originalDocumentContent: nextOriginalDocumentContent,
            explodedDocumentContent: nextExplodedDocumentContent,
            updatedAt: now,
          }
          : file
      ),
    }), { persistToast: 'Document changes saved.' });
    clearStoredEditorDraft(editingDocumentDraft.id);
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, toast, updateWorkspace, workspace.files]);

  const handleDiscardFileEditorDraft = useCallback((): void => {
    if (editingDocumentDraft) {
      clearStoredEditorDraft(editingDocumentDraft.id);
    }
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft]);

  useEffect(() => {
    if (!editingDocumentDraft) return;
    const timer = window.setTimeout(() => {
      writeStoredEditorDraft(editingDocumentDraft.id, editingDocumentDraft);
    }, 250);
    return (): void => window.clearTimeout(timer);
  }, [editingDocumentDraft]);

  // Prompt Exploder sync
  useEffect(() => {
    const payload = consumePromptExploderApplyPromptForCaseResolver();
    if (!payload?.prompt?.trim()) return;

    const targetFileId = payload.caseResolverContext?.fileId ?? workspace.activeFileId ?? null;
    if (!targetFileId) return;

    const proposalState = buildCaseResolverCaptureProposalState(
      payload.caseResolverParties,
      targetFileId,
      filemakerDatabase,
      caseResolverCaptureSettings
    );
    const nextExplodedContent = stripCapturedAddressLinesFromText(payload.prompt, proposalState);
    const extractedDocumentDate = extractCaseResolverDocumentDate(nextExplodedContent);
    const now = new Date().toISOString();
    const canonicalExploded = deriveDocumentContentSync({
      mode: 'markdown',
      value: nextExplodedContent,
    });
    const explodedStoredContent = toStorageDocumentValue(canonicalExploded);
    const proposedAddresserReference =
      proposalState?.addresser?.action === 'database'
        ? proposalState?.addresser?.existingReference ?? undefined
        : undefined;
    const proposedAddresseeReference =
      proposalState?.addressee?.action === 'database'
        ? proposalState?.addressee?.existingReference ?? undefined
        : undefined;

    updateWorkspace((current) => ({
      ...current,
      activeFileId: targetFileId,
      files: current.files.map((file) => {
        if (file.id !== targetFileId) return file;
        return {
          ...file,
          originalDocumentContent: file.originalDocumentContent ?? file.documentContent,
          explodedDocumentContent: explodedStoredContent,
          activeDocumentVersion: 'exploded',
          editorType: canonicalExploded.mode,
          documentContentFormatVersion: 1,
          documentContentVersion: file.documentContentVersion + 1,
          documentContent: explodedStoredContent,
          documentContentMarkdown: canonicalExploded.markdown,
          documentContentHtml: canonicalExploded.html,
          documentContentPlainText: canonicalExploded.plainText,
          documentConversionWarnings: canonicalExploded.warnings,
          lastContentConversionAt: now,
          documentDate: extractedDocumentDate ?? file.documentDate,
          ...(proposedAddresserReference ? { addresser: proposedAddresserReference } : {}),
          ...(proposedAddresseeReference ? { addressee: proposedAddresseeReference } : {}),
          updatedAt: now,
        };
      }),
    }));

    setEditingDocumentDraft((current) => {
      if (current?.id !== targetFileId) return current;
      const nextVersion = current.documentContentVersion + 1;
      return {
        ...current,
        originalDocumentContent: current.originalDocumentContent || current.documentContent,
        explodedDocumentContent: explodedStoredContent,
        activeDocumentVersion: 'exploded',
        editorType: canonicalExploded.mode,
        documentContentFormatVersion: 1,
        documentContentVersion: nextVersion,
        baseDocumentContentVersion: nextVersion,
        documentContent: explodedStoredContent,
        documentContentMarkdown: canonicalExploded.markdown,
        documentContentHtml: canonicalExploded.html,
        documentContentPlainText: canonicalExploded.plainText,
        documentConversionWarnings: canonicalExploded.warnings,
        lastContentConversionAt: now,
        documentDate: extractedDocumentDate ?? current.documentDate,
        ...(proposedAddresserReference ? { addresser: proposedAddresserReference } : {}),
        ...(proposedAddresseeReference ? { addressee: proposedAddresseeReference } : {}),
      };
    });

    if (proposalState) {
      setPromptExploderPartyProposal(proposalState);
      if (caseResolverCaptureSettings.autoOpenProposalModal) {
        setIsPromptExploderPartyProposalOpen(true);
      }
    }
    toast('Exploded text returned to Case Resolver.', { variant: 'success' });
  }, [
    caseResolverCaptureSettings,
    filemakerDatabase,
    toast,
    workspace.activeFileId,
    updateWorkspace,
  ]);

  return {
    workspace,
    setWorkspace,
    updateWorkspace,
    selectedFileId,
    setSelectedFileId,
    selectedFolderPath,
    setSelectedFolderPath,
    selectedAssetId,
    setSelectedAssetId,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    activeMainView,
    setActiveMainView,
    isPreviewPageVisible,
    setIsPreviewPageVisible,
    isPartiesModalOpen,
    setIsPartiesModalOpen,
    editingDocumentDraft,
    setEditingDocumentDraft,
    isUploadingScanDraftFiles,
    setIsUploadingScanDraftFiles,
    uploadingScanSlotId,
    setUploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    filemakerDatabase,
    countries,
    isMenuCollapsed,
    setIsMenuCollapsed,
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
    handleUpdateActiveFileParties,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal
  };
}
