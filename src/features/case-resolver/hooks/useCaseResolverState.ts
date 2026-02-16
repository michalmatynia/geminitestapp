'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import type { FilemakerDatabase, FilemakerEntityKind } from '@/features/filemaker/types';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import {
  consumePromptExploderApplyPromptForCaseResolver,
} from '@/features/prompt-exploder/bridge';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  normalizeCaseResolverComparable,
} from '../party-matching';
import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  extractCaseResolverDocumentDate,
  parseCaseResolverCategories,
  parseCaseResolverTags,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
  renameFolderPath,
} from '../settings';

import type {
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverDocumentVersion,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverPartyReference,
  CaseResolverScanSlot,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const isPathWithinFolder = (candidatePath: string, folderPath: string): boolean => (
  candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`)
);

const createUniqueFolderPath = (existingFolders: string[], targetFolderPath: string | null): string => {
  const parent = normalizeFolderPath(targetFolderPath ?? '');
  const existing = new Set(existingFolders.map((folder: string) => normalizeFolderPath(folder)));
  const baseName = 'new-folder';

  let index = 1;
  while (index < 10000) {
    const candidateName = index === 1 ? baseName : `${baseName}-${index}`;
    const candidatePath = normalizeFolderPath(parent ? `${parent}/${candidateName}` : candidateName);
    if (candidatePath && !existing.has(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalizeFolderPath(parent ? `${parent}/${baseName}-${Date.now()}` : `${baseName}-${Date.now()}`);
};

const promptForName = (label: string, fallback: string): string | null => {
  const result = window.prompt(label, fallback);
  if (!result) return null;
  const normalized = result.trim();
  if (!normalized) return null;
  return normalized;
};

const buildFileEditDraft = (file: CaseResolverFile): CaseResolverFileEditDraft => {
  const originalDocumentContent = file.originalDocumentContent ?? file.documentContent;
  const explodedDocumentContent = file.explodedDocumentContent ?? '';
  const requestedVersion: CaseResolverDocumentVersion = file.activeDocumentVersion === 'exploded'
    ? 'exploded'
    : 'original';
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  return {
    id: file.id,
    fileType: file.fileType,
    name: file.name,
    folder: file.folder,
    parentCaseId: file.parentCaseId,
    referenceCaseIds: file.referenceCaseIds,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    documentDate: file.documentDate,
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    documentContent: activeDocumentVersion === 'exploded' && explodedDocumentContent.trim().length > 0
      ? explodedDocumentContent
      : originalDocumentContent,
    scanSlots: file.scanSlots,
    addresser: file.addresser,
    addressee: file.addressee,
    tagId: file.tagId,
    categoryId: file.categoryId,
  };
};

const removeLinkedDocumentFileId = (
  graph: CaseResolverGraph,
  fileId: string
): CaseResolverGraph => {
  const source = graph.documentFileLinksByNode ?? {};
  const sourceByNode = graph.documentSourceFileIdByNode ?? {};
  let changed = false;
  const nextLinks: Record<string, string[]> = {};
  const nextSourceByNode: Record<string, string> = {};

  Object.entries(source).forEach(([nodeId, links]: [string, string[]]) => {
    const filtered = links.filter((linkedFileId: string) => linkedFileId !== fileId);
    if (filtered.length !== links.length) changed = true;
    nextLinks[nodeId] = filtered;
  });

  Object.entries(sourceByNode).forEach(([nodeId, linkedFileId]: [string, string]) => {
    if (linkedFileId === fileId) {
      changed = true;
      return;
    }
    nextSourceByNode[nodeId] = linkedFileId;
  });

  if (!changed) return graph;

  return {
    ...graph,
    documentFileLinksByNode: nextLinks,
    documentSourceFileIdByNode: nextSourceByNode,
  };
};

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState() {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
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
  const [hasHandledRequestedEditorOpen, setHasHandledRequestedEditorOpen] = useState(false);

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const lastPersistedValueRef = useRef<string>(JSON.stringify(parsedWorkspace));
  const pendingSaveToastRef = useRef<string | null>(null);

  // Sync with store
  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

  // Handle auto-save
  useEffect(() => {
    const serialized = JSON.stringify(workspace);
    if (serialized === lastPersistedValueRef.current) return;
    
    const timer = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await updateSetting.mutateAsync({
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: serialized,
          });
          lastPersistedValueRef.current = serialized;
          if (pendingSaveToastRef.current) {
            toast(pendingSaveToastRef.current, { variant: 'success' });
            pendingSaveToastRef.current = null;
          }
        } catch (error) {
          toast('Failed to save Case Resolver workspace.', { variant: 'error' });
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [workspace, updateSetting, toast]);

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
  }, [defaultCategoryId, defaultTagId, updateWorkspace]);

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
    setEditingDocumentDraft(buildFileEditDraft(target));
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
    const now = new Date().toISOString();
    updateWorkspace((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === editingDocumentDraft.id
          ? {
            ...file,
            ...editingDocumentDraft,
            updatedAt: now,
          }
          : file
      ),
    }), { persistToast: 'Document changes saved.' });
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, updateWorkspace]);

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
  };
}
