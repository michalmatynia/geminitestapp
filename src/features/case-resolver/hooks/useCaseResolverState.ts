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
  ensureSafeDocumentHtml,
  normalizeRawDocumentModeFromContent,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker/settings';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import { consumePromptExploderApplyPromptForCaseResolver, } from '@/features/prompt-exploder/bridge';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  extractCaseResolverDocumentDate,
  hasCaseResolverWorkspaceFilesArray,
  inferCaseResolverAssetKind,
  parseCaseResolverCategories,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
  renameFolderPath,
} from '../settings';
import {
  buildCombinedOcrText,
  buildFileEditDraft,
  createId,
  createUniqueFolderPath,
  isPathWithinFolder,
} from '../utils/caseResolverUtils';
import {
  createCaseResolverWorkspaceMutationId,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';

import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverIdentifier,
  CaseResolverScanSlot,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';
const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';
const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;

type StoredCaseResolverEditorDraft = {
  fileId: string;
  baseDocumentContentVersion: number;
  updatedAt: string;
  draft: CaseResolverFileEditDraft;
};

type CaseResolverUploadedFile = {
  id: string | null;
  originalName: string;
  kind: CaseResolverAssetKind;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  folder: string;
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

const normalizeUploadedCaseResolverFile = (
  payload: unknown,
  fallbackFile: File,
  fallbackFolder: string
): CaseResolverUploadedFile => {
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const originalName =
    typeof record['originalName'] === 'string' && record['originalName'].trim().length > 0
      ? record['originalName'].trim()
      : fallbackFile.name.trim() || 'Scan';
  const filepath =
    typeof record['filepath'] === 'string' && record['filepath'].trim().length > 0
      ? record['filepath'].trim()
      : null;
  const mimetype =
    typeof record['mimetype'] === 'string' && record['mimetype'].trim().length > 0
      ? record['mimetype'].trim()
      : fallbackFile.type.trim() || null;
  const size =
    typeof record['size'] === 'number' && Number.isFinite(record['size']) && record['size'] >= 0
      ? Math.round(record['size'])
      : Number.isFinite(fallbackFile.size) && fallbackFile.size >= 0
        ? Math.round(fallbackFile.size)
        : null;
  const folder =
    typeof record['folder'] === 'string' && record['folder'].trim().length > 0
      ? record['folder'].trim()
      : fallbackFolder;
  const kind = inferCaseResolverAssetKind({
    kind: typeof record['kind'] === 'string' ? record['kind'] : null,
    mimeType: typeof record['mimetype'] === 'string' ? record['mimetype'] : fallbackFile.type,
    name:
      typeof record['originalName'] === 'string' && record['originalName'].trim().length > 0
        ? record['originalName']
        : fallbackFile.name,
  });
  return {
    id:
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : null,
    originalName,
    kind,
    filepath,
    mimetype,
    size,
    folder,
  };
};

const IMAGE_FILENAME_EXTENSION_PATTERN =
  /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic|heif|tif|tiff|svg)$/i;

const isLikelyImageFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  return IMAGE_FILENAME_EXTENSION_PATTERN.test(file.name.trim());
};

const CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS = 900;
const CASE_RESOLVER_OCR_JOB_TIMEOUT_MS = 120_000;

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, durationMs));
  });

const createPlaceholderAssetName = ({
  assets,
  folder,
  baseName,
}: {
  assets: CaseResolverAssetFile[];
  folder: string;
  baseName: string;
}): string => {
  const normalizedBase = baseName.trim() || 'Untitled Asset';
  const normalizedFolder = normalizeFolderPath(folder);
  const namesInFolder = new Set(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => asset.folder === normalizedFolder)
      .map((asset: CaseResolverAssetFile): string => asset.name.trim().toLowerCase())
  );
  if (!namesInFolder.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (index < 10_000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!namesInFolder.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }
  return `${normalizedBase}-${createId('dup')}`;
};

const createUniqueCaseFileName = ({
  files,
  folder,
  baseName,
}: {
  files: CaseResolverFile[];
  folder: string;
  baseName: string;
}): string => {
  const normalizedBase = baseName.trim() || 'Untitled File';
  const normalizedFolder = normalizeFolderPath(folder);
  const namesInFolder = new Set(
    files
      .filter((file: CaseResolverFile): boolean => file.folder === normalizedFolder)
      .map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!namesInFolder.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (index < 10_000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!namesInFolder.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }
  return `${normalizedBase}-${createId('dup')}`;
};

const resolveUploadBucketForAssetKind = (
  kind: CaseResolverAssetKind
): 'images' | 'pdfs' | 'files' => {
  if (kind === 'image') return 'images';
  if (kind === 'pdf') return 'pdfs';
  return 'files';
};

const resolveUploadBaseFolder = (folder: string, kind: CaseResolverAssetKind): string => {
  const normalizedFolder = normalizeFolderPath(folder);
  if (!normalizedFolder) return '';
  const bucket = resolveUploadBucketForAssetKind(kind);
  if (normalizedFolder === bucket) return '';
  const suffix = `/${bucket}`;
  if (normalizedFolder.endsWith(suffix)) {
    return normalizedFolder.slice(0, -suffix.length);
  }
  return normalizedFolder;
};

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState() {
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawCaseResolverSettings = settingsStore.get(CASE_RESOLVER_SETTINGS_KEY);
  const rawCaseResolverDefaultDocumentFormat = settingsStore.get(
    CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY
  );
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCaseResolverCaptureSettings = settingsStore.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY);
  
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const canHydrateWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspace),
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
  const caseResolverSettings = useMemo(() => {
    const parsed = parseCaseResolverSettings(rawCaseResolverSettings);
    const defaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
      rawCaseResolverDefaultDocumentFormat,
      parsed.defaultDocumentFormat
    );
    if (defaultDocumentFormat === parsed.defaultDocumentFormat) return parsed;
    return {
      ...parsed,
      defaultDocumentFormat,
    };
  }, [rawCaseResolverDefaultDocumentFormat, rawCaseResolverSettings]);
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
  const lastPersistedRevisionRef = useRef<number>(getCaseResolverWorkspaceRevision(parsedWorkspace));
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const queuedExpectedRevisionRef = useRef<number | null>(null);
  const queuedMutationIdRef = useRef<string | null>(null);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);
  const handledRequestedFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceRefreshFileIdRef = useRef<string | null>(null);

  const flushWorkspacePersist = useCallback((): void => {
    if (persistWorkspaceInFlightRef.current) return;
    const nextSerialized = queuedSerializedWorkspaceRef.current;
    if (!nextSerialized || nextSerialized === lastPersistedValueRef.current) return;
    const expectedRevision =
      queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current;
    const mutationId =
      queuedMutationIdRef.current ??
      createCaseResolverWorkspaceMutationId('case-resolver-workspace-auto');
    const parsedWorkspaceForPersist = parseCaseResolverWorkspace(nextSerialized);

    persistWorkspaceInFlightRef.current = true;
    void persistCaseResolverWorkspaceSnapshot({
      workspace: parsedWorkspaceForPersist,
      expectedRevision,
      mutationId,
      source: 'case_view',
    }).then((result) => {
      if (result.ok) {
        const persistedWorkspace = result.workspace;
        const persistedSerialized = JSON.stringify(persistedWorkspace);
        lastPersistedValueRef.current = persistedSerialized;
        lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(persistedWorkspace);
        if (queuedSerializedWorkspaceRef.current === nextSerialized) {
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
        } else if (queuedSerializedWorkspaceRef.current) {
          queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
        }
        if (pendingSaveToastRef.current) {
          toast(pendingSaveToastRef.current, { variant: 'success' });
          pendingSaveToastRef.current = null;
        }
        return;
      }

      if (result.conflict) {
        const serverWorkspace = result.workspace;
        const serverSerialized = JSON.stringify(serverWorkspace);
        lastPersistedValueRef.current = serverSerialized;
        lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(serverWorkspace);
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        pendingSaveToastRef.current = null;
        setWorkspace(serverWorkspace);
        toast('Case Resolver workspace changed in another tab. Loaded latest server state.', {
          variant: 'warning',
        });
        return;
      }

      if (pendingSaveToastRef.current) {
        pendingSaveToastRef.current = null;
      }
      toast(result.error || 'Failed to save Case Resolver workspace.', { variant: 'error' });
    }).finally(() => {
      persistWorkspaceInFlightRef.current = false;
      if (
        queuedSerializedWorkspaceRef.current &&
        queuedSerializedWorkspaceRef.current !== lastPersistedValueRef.current
      ) {
        flushWorkspacePersist();
      }
    });
  }, [toast]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    const incomingSerialized = JSON.stringify(parsedWorkspace);
    const incomingRevision = getCaseResolverWorkspaceRevision(parsedWorkspace);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const currentSerialized = JSON.stringify(current);
      if (incomingSerialized === currentSerialized) {
        return current;
      }

      if (requestedFileId) {
        const currentHasRequestedFile = current.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        const incomingHasRequestedFile = parsedWorkspace.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        if (!currentHasRequestedFile && incomingHasRequestedFile) {
          lastPersistedValueRef.current = incomingSerialized;
          lastPersistedRevisionRef.current = incomingRevision;
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
          return parsedWorkspace;
        }
      }

      const currentRevision = getCaseResolverWorkspaceRevision(current);
      if (incomingRevision <= currentRevision) return current;

      lastPersistedValueRef.current = incomingSerialized;
      lastPersistedRevisionRef.current = incomingRevision;
      queuedSerializedWorkspaceRef.current = null;
      queuedExpectedRevisionRef.current = null;
      queuedMutationIdRef.current = null;
      return parsedWorkspace;
    });
  }, [canHydrateWorkspaceFromStore, parsedWorkspace, requestedFileId]);

  // Handle auto-save
  useEffect(() => {
    const serialized = JSON.stringify(workspace);
    if (serialized === lastPersistedValueRef.current) return;
    queuedSerializedWorkspaceRef.current = serialized;
    if (queuedExpectedRevisionRef.current === null) {
      queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
    }
    if (!queuedMutationIdRef.current) {
      queuedMutationIdRef.current =
        workspace.lastMutationId ??
        createCaseResolverWorkspaceMutationId('case-resolver-workspace-auto');
    }

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
      options?: { persistToast?: string; mutationId?: string; source?: string }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const normalizedCurrent = normalizeCaseResolverWorkspace(current);
        const updated = updater(normalizedCurrent);
        if (updated === current || updated === normalizedCurrent) return current;
        const normalizedUpdated = normalizeCaseResolverWorkspace(updated);
        const mutationId =
          options?.mutationId?.trim() ||
          createCaseResolverWorkspaceMutationId('case-resolver-workspace');
        const stampedWorkspace = stampCaseResolverWorkspaceMutation(normalizedUpdated, {
          baseRevision: getCaseResolverWorkspaceRevision(normalizedCurrent),
          mutationId,
        });
        logCaseResolverWorkspaceEvent({
          source: options?.source ?? 'case_view',
          action: 'mutation_enqueued',
          mutationId,
          expectedRevision:
            queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current,
          workspaceRevision: getCaseResolverWorkspaceRevision(stampedWorkspace),
        });
        if (options?.persistToast) pendingSaveToastRef.current = options.persistToast;
        if (queuedExpectedRevisionRef.current === null) {
          queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
        }
        queuedMutationIdRef.current = mutationId;
        return stampedWorkspace;
      });
    },
    []
  );

  const { confirm, ConfirmationModal } = useConfirm();
  const { prompt, PromptInputModal } = usePrompt();

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

  const filesById = useMemo(
    () => new Map(workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])),
    [workspace.files]
  );

  const selectedCaseContainerId = useMemo((): string | null => {
    const contextFileId = selectedFileId ?? workspace.activeFileId;
    if (!contextFileId) return null;
    const contextFile = filesById.get(contextFileId) ?? null;
    if (!contextFile) return null;
    if (contextFile.fileType === 'case') return contextFile.id;
    if (!contextFile.parentCaseId) return null;
    const parentFile = filesById.get(contextFile.parentCaseId) ?? null;
    return parentFile?.fileType === 'case' ? parentFile.id : null;
  }, [filesById, selectedFileId, workspace.activeFileId]);

  const handleCreateFile = useCallback((targetFolderPath: string | null): void => {
    prompt({
      title: 'Create New Document',
      label: 'Document Name',
      defaultValue: 'New Document',
      placeholder: 'Enter document name...',
      required: true,
      onConfirm: (fileName) => {
        const folder = normalizeFolderPath(targetFolderPath ?? '');
        const runtimeCaseResolverSettings = parseCaseResolverSettings(
          settingsStore.get(CASE_RESOLVER_SETTINGS_KEY)
        );
        const runtimeDefaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
          settingsStore.get(CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY),
          runtimeCaseResolverSettings.defaultDocumentFormat
        );
        const file = createCaseResolverFile({
          id: createId('case-file'),
          fileType: 'document',
          name: fileName,
          folder,
          parentCaseId: selectedCaseContainerId,
          editorType: runtimeDefaultDocumentFormat,
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
      }
    });
  }, [
    defaultCaseIdentifierId,
    defaultCategoryId,
    defaultTagId,
    settingsStore,
    selectedCaseContainerId,
    updateWorkspace,
    prompt,
  ]);

  const uploadSourceFileToCaseResolver = useCallback(
    async (sourceFile: File, targetFolderPath: string): Promise<CaseResolverUploadedFile> => {
      const uploadFormData = new FormData();
      uploadFormData.append('folder', targetFolderPath);
      uploadFormData.append('file', sourceFile);
      const uploadResponse = await fetch('/api/case-resolver/assets/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const fallbackMessage = `Failed to upload file (${uploadResponse.status})`;
        const errorBody = await uploadResponse.text();
        throw new Error(errorBody || fallbackMessage);
      }
      const uploadPayload = (await uploadResponse.json()) as unknown;
      const firstEntry: unknown = Array.isArray(uploadPayload)
        ? (uploadPayload[0] ?? null)
        : uploadPayload;
      return normalizeUploadedCaseResolverFile(firstEntry, sourceFile, targetFolderPath);
    },
    []
  );

  const resolveRuntimeScanOcrSettings = useCallback(
    (): { model: string; prompt: string } => {
      const runtimeCaseResolverSettings = parseCaseResolverSettings(
        settingsStore.get(CASE_RESOLVER_SETTINGS_KEY)
      );
      return {
        model:
          runtimeCaseResolverSettings.ocrModel.trim() ||
          (settingsStore.get('openai_model') ?? '').trim(),
        prompt:
          runtimeCaseResolverSettings.ocrPrompt.trim() ||
          DEFAULT_CASE_RESOLVER_OCR_PROMPT,
      };
    },
    [settingsStore]
  );

  const enqueueImageOcrRuntimeJob = useCallback(
    async (input: {
      filepath: string;
      runtime: { model: string; prompt: string };
    }): Promise<string> => {
      const response = await fetch('/api/case-resolver/ocr/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filepath: input.filepath,
          model: input.runtime.model,
          prompt: input.runtime.prompt,
        }),
      });
      if (!response.ok) {
        const fallbackMessage = `Failed to queue OCR runtime job (${response.status})`;
        const errorBody = await response.text();
        throw new Error(errorBody || fallbackMessage);
      }
      const payload = (await response.json()) as {
        job?: { id?: unknown } | null;
      };
      const jobIdRaw = payload.job?.id;
      if (typeof jobIdRaw !== 'string' || jobIdRaw.trim().length === 0) {
        throw new Error('OCR runtime job id was not returned.');
      }
      return jobIdRaw.trim();
    },
    []
  );

  const pollImageOcrRuntimeJob = useCallback(
    async (jobId: string): Promise<string> => {
      const startedAt = Date.now();
      while (Date.now() - startedAt <= CASE_RESOLVER_OCR_JOB_TIMEOUT_MS) {
        const response = await fetch(
          `/api/case-resolver/ocr/jobs/${encodeURIComponent(jobId)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );
        if (!response.ok) {
          const fallbackMessage = `Failed to read OCR runtime job (${response.status})`;
          const errorBody = await response.text();
          throw new Error(errorBody || fallbackMessage);
        }

        const payload = (await response.json()) as {
          job?: {
            status?: unknown;
            resultText?: unknown;
            errorMessage?: unknown;
          } | null;
        };
        const status =
          typeof payload.job?.status === 'string'
            ? payload.job.status.trim().toLowerCase()
            : '';

        if (status === 'completed') {
          return typeof payload.job?.resultText === 'string'
            ? payload.job.resultText.trim()
            : '';
        }
        if (status === 'failed') {
          const errorMessage = payload.job?.errorMessage;
          throw new Error(
            typeof errorMessage === 'string' && errorMessage.trim().length > 0
              ? errorMessage.trim()
              : 'OCR runtime job failed.'
          );
        }

        await sleep(CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS);
      }

      throw new Error('OCR runtime job timed out.');
    },
    []
  );

  const handleCreateScanFile = useCallback((targetFolderPath: string | null): void => {
    const folder = normalizeFolderPath(targetFolderPath ?? '');
    const runtimeCaseResolverSettings = parseCaseResolverSettings(
      settingsStore.get(CASE_RESOLVER_SETTINGS_KEY)
    );
    const runtimeDefaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
      settingsStore.get(CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY),
      runtimeCaseResolverSettings.defaultDocumentFormat
    );
    const createdFileId = createId('case-file');

    updateWorkspace((current) => {
      const name = createUniqueCaseFileName({
        files: current.files,
        folder,
        baseName: 'New Image',
      });
      const createdFile = createCaseResolverFile({
        id: createdFileId,
        fileType: 'scanfile',
        name,
        folder,
        parentCaseId: selectedCaseContainerId,
        editorType: runtimeDefaultDocumentFormat,
        scanSlots: [],
        tagId: defaultTagId,
        caseIdentifierId: defaultCaseIdentifierId,
        categoryId: defaultCategoryId,
      });
      return {
        ...current,
        files: [...current.files, createdFile],
        folders: normalizeFolderPaths([...current.folders, folder]),
      };
    }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

    toast('New image file created.', { variant: 'success' });
  }, [
    defaultCaseIdentifierId,
    defaultCategoryId,
    defaultTagId,
    selectedCaseContainerId,
    settingsStore,
    toast,
    updateWorkspace,
  ]);

  const handleUploadScanFiles = useCallback(
    async (fileId: string, files: File[]): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }

      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return;

      const normalizedFolder = normalizeFolderPath(targetFile.folder);
      const createdSlots: CaseResolverScanSlot[] = [];
      const createdFolders = new Set<string>();
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        if (!isLikelyImageFile(sourceFile)) {
          failedFiles.push(`${sourceFile.name || 'file'}: Only image files are supported.`);
          continue;
        }
        try {
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, 'image');
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          createdSlots.push({
            id: createId('scan-slot'),
            name: uploaded.originalName,
            filepath: uploaded.filepath,
            sourceFileId: uploaded.id,
            mimeType: uploaded.mimetype,
            size: uploaded.size,
            ocrText: '',
          });
          createdFolders.add(normalizeFolderPath(uploaded.folder || normalizedFolder));
        } catch (error: unknown) {
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${
              error instanceof Error ? error.message : 'Upload failed'
            }`
          );
        }
      }

      if (createdSlots.length > 0) {
        updateWorkspace((current) => {
          const now = new Date().toISOString();
          let didUpdate = false;
          const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
            if (file.id !== fileId || file.fileType !== 'scanfile') return file;
            didUpdate = true;
            return {
              ...file,
              scanSlots: [...file.scanSlots, ...createdSlots],
              updatedAt: now,
            };
          });
          if (!didUpdate) return current;
          return {
            ...current,
            files: nextFiles,
            folders: normalizeFolderPaths([
              ...current.folders,
              ...Array.from(createdFolders),
            ]),
          };
        }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
        setEditingDocumentDraft((current) => {
          if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
          return {
            ...current,
            scanSlots: [...current.scanSlots, ...createdSlots],
            updatedAt: new Date().toISOString(),
          };
        });
        toast(
          createdSlots.length === 1
            ? 'Image uploaded to scan file.'
            : `${createdSlots.length} images uploaded to scan file.`,
          { variant: 'success' }
        );
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? failedFiles[0] ?? 'Failed to upload image.'
            : `${failedFiles.length} images failed to upload.`,
          { variant: 'error' }
        );
      }
    },
    [toast, updateWorkspace, uploadSourceFileToCaseResolver, workspace.files]
  );

  const handleRunScanFileOcr = useCallback(
    async (fileId: string): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }
      const draftScanSlots =
        editingDocumentDraft?.id === fileId && editingDocumentDraft.fileType === 'scanfile'
          ? editingDocumentDraft.scanSlots
          : null;
      const scanSlotsForOcr =
        draftScanSlots && draftScanSlots.length > 0
          ? draftScanSlots
          : targetFile.scanSlots;

      if (scanSlotsForOcr.length === 0) {
        toast('Upload at least one image to this file before running OCR.', {
          variant: 'warning',
        });
        return;
      }

      setIsUploadingScanDraftFiles(true);
      setUploadingScanSlotId('all');

      try {
        const runtime = resolveRuntimeScanOcrSettings();
        const nextSlots: CaseResolverScanSlot[] = [];
        const failedSlots: string[] = [];
        let successfulSlots = 0;

        for (let index = 0; index < scanSlotsForOcr.length; index += 1) {
          const slot = scanSlotsForOcr[index];
          if (!slot) continue;
          setUploadingScanSlotId(slot.id);
          if (!slot.filepath) {
            nextSlots.push(slot);
            failedSlots.push(`${slot.name || `Slot ${index + 1}`}: Missing file path.`);
            continue;
          }
          try {
            const runtimeJobId = await enqueueImageOcrRuntimeJob({
              filepath: slot.filepath,
              runtime,
            });
            const extractedText = await pollImageOcrRuntimeJob(runtimeJobId);
            nextSlots.push({
              ...slot,
              ocrText: extractedText,
            });
            successfulSlots += 1;
          } catch (error: unknown) {
            nextSlots.push(slot);
            failedSlots.push(
              `${slot.name || `Slot ${index + 1}`}: ${
                error instanceof Error ? error.message : 'OCR failed'
              }`
            );
          }
        }

        if (successfulSlots > 0) {
          updateWorkspace((current) => {
            const now = new Date().toISOString();
            let didUpdate = false;
            const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
              if (file.id !== fileId || file.fileType !== 'scanfile') return file;
              didUpdate = true;
              const mergedText = buildCombinedOcrText(nextSlots);
              const mode = file.editorType === 'wysiwyg' ? 'wysiwyg' : 'markdown';
              const canonicalDocument = deriveDocumentContentSync({
                mode,
                value: mode === 'wysiwyg' ? ensureSafeDocumentHtml(mergedText) : mergedText,
              });
              const storedDocumentContent = toStorageDocumentValue(canonicalDocument);
              const nextOriginalDocumentContent =
                file.activeDocumentVersion === 'original'
                  ? storedDocumentContent
                  : file.originalDocumentContent;
              const nextExplodedDocumentContent =
                file.activeDocumentVersion === 'exploded'
                  ? storedDocumentContent
                  : file.explodedDocumentContent;
              return {
                ...file,
                scanSlots: nextSlots,
                editorType: canonicalDocument.mode,
                documentContentVersion: file.documentContentVersion + 1,
                documentContent: storedDocumentContent,
                documentContentMarkdown: canonicalDocument.markdown,
                documentContentHtml: canonicalDocument.html,
                documentContentPlainText: canonicalDocument.plainText,
                originalDocumentContent: nextOriginalDocumentContent,
                explodedDocumentContent: nextExplodedDocumentContent,
                documentConversionWarnings: canonicalDocument.warnings,
                lastContentConversionAt: now,
                updatedAt: now,
              };
            });
            if (!didUpdate) return current;
            return {
              ...current,
              files: nextFiles,
            };
          }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
          setEditingDocumentDraft((current) => {
            if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
            const now = new Date().toISOString();
            const mergedText = buildCombinedOcrText(nextSlots);
            const mode = current.editorType === 'wysiwyg' ? 'wysiwyg' : 'markdown';
            const canonicalDocument = deriveDocumentContentSync({
              mode,
              value: mode === 'wysiwyg' ? ensureSafeDocumentHtml(mergedText) : mergedText,
            });
            const storedDocumentContent = toStorageDocumentValue(canonicalDocument);
            const nextOriginalDocumentContent =
              current.activeDocumentVersion === 'original'
                ? storedDocumentContent
                : current.originalDocumentContent;
            const nextExplodedDocumentContent =
              current.activeDocumentVersion === 'exploded'
                ? storedDocumentContent
                : current.explodedDocumentContent;
            return {
              ...current,
              scanSlots: nextSlots,
              editorType: canonicalDocument.mode,
              baseDocumentContentVersion: current.baseDocumentContentVersion + 1,
              documentContentVersion: current.documentContentVersion + 1,
              documentContent: storedDocumentContent,
              documentContentMarkdown: canonicalDocument.markdown,
              documentContentHtml: canonicalDocument.html,
              documentContentPlainText: canonicalDocument.plainText,
              originalDocumentContent: nextOriginalDocumentContent,
              explodedDocumentContent: nextExplodedDocumentContent,
              documentConversionWarnings: canonicalDocument.warnings,
              lastContentConversionAt: now,
              updatedAt: now,
            };
          });
          toast(
            successfulSlots === 1
              ? 'OCR finished for 1 image.'
              : `OCR finished for ${successfulSlots} images.`,
            { variant: 'success' }
          );
        }

        if (failedSlots.length > 0) {
          toast(
            failedSlots.length === 1
              ? failedSlots[0] ?? 'OCR failed for one image.'
              : `${failedSlots.length} images failed during OCR.`,
            { variant: 'error' }
          );
        }
      } finally {
        setUploadingScanSlotId(null);
        setIsUploadingScanDraftFiles(false);
      }
    },
    [
      enqueueImageOcrRuntimeJob,
      editingDocumentDraft,
      pollImageOcrRuntimeJob,
      resolveRuntimeScanOcrSettings,
      toast,
      updateWorkspace,
      workspace.files,
    ]
  );

  const handleCreateImageAsset = useCallback((targetFolderPath: string | null): void => {
    const folder = normalizeFolderPath(targetFolderPath ?? '');
    const createdAssetId = createId('asset');
    updateWorkspace((current) => {
      const name = createPlaceholderAssetName({
        assets: current.assets,
        folder,
        baseName: 'New Image',
      });
      const createdAsset = createCaseResolverAssetFile({
        id: createdAssetId,
        name,
        folder,
        kind: 'image',
      });
      return {
        ...current,
        assets: [...current.assets, createdAsset],
        folders: normalizeFolderPaths([...current.folders, folder]),
      };
    }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    setSelectedFileId(null);
    setSelectedFolderPath(null);
    setSelectedAssetId(createdAssetId);
    toast('Image placeholder created. Upload the file when ready.', { variant: 'success' });
  }, [toast, updateWorkspace]);

  const handleUploadAssets = useCallback(
    async (
      files: File[],
      targetFolderPath: string | null
    ): Promise<CaseResolverAssetFile[]> => {
      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return [];

      const normalizedFolder = normalizeFolderPath(targetFolderPath ?? '');
      const createdAssets: CaseResolverAssetFile[] = [];
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        try {
          const inferredKind = inferCaseResolverAssetKind({
            mimeType: sourceFile.type,
            name: sourceFile.name,
          });
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, inferredKind);
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          const fallbackName = sourceFile.name.trim() || `File ${createdAssets.length + 1}`;
          const assetName = uploaded.originalName.trim() || fallbackName;
          createdAssets.push(
            createCaseResolverAssetFile({
              id: createId('asset'),
              name: assetName,
              folder: uploaded.folder || normalizedFolder,
              kind: uploaded.kind,
              filepath: uploaded.filepath,
              sourceFileId: uploaded.id,
              mimeType: uploaded.mimetype,
              size: uploaded.size,
            })
          );
        } catch (error: unknown) {
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${error instanceof Error ? error.message : 'Upload failed'}`
          );
        }
      }

      if (createdAssets.length > 0) {
        updateWorkspace((current) => ({
          ...current,
          assets: [...current.assets, ...createdAssets],
          folders: normalizeFolderPaths([
            ...current.folders,
            ...createdAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
          ]),
        }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? failedFiles[0] ?? 'Failed to upload file.'
            : `${failedFiles.length} files failed to upload.`,
          { variant: 'error' }
        );
      }

      if (createdAssets.length === 0 && failedFiles.length > 0) {
        throw new Error(failedFiles[0] ?? 'Failed to upload files.');
      }

      return createdAssets;
    },
    [toast, updateWorkspace, uploadSourceFileToCaseResolver]
  );

  const handleAttachAssetFile = useCallback(
    async (
      assetId: string,
      file: File,
      options?: { expectedKind?: CaseResolverAssetKind | null }
    ): Promise<CaseResolverAssetFile> => {
      const currentAsset = workspace.assets.find(
        (asset: CaseResolverAssetFile): boolean => asset.id === assetId
      );
      if (!currentAsset) {
        throw new Error('Asset placeholder no longer exists.');
      }

      const expectedKind = options?.expectedKind ?? currentAsset.kind;
      if (expectedKind === 'image' && !isLikelyImageFile(file)) {
        throw new Error('Please upload an image file for this image placeholder.');
      }

      const uploadFolder = normalizeFolderPath(currentAsset.folder);
      const uploadBaseFolder = resolveUploadBaseFolder(uploadFolder, expectedKind);
      const uploaded = await uploadSourceFileToCaseResolver(file, uploadBaseFolder);
      const uploadedKind = inferCaseResolverAssetKind({
        kind: uploaded.kind,
        mimeType: uploaded.mimetype,
        name: uploaded.originalName,
      });
      if (
        expectedKind &&
        expectedKind !== 'file' &&
        uploadedKind !== expectedKind
      ) {
        throw new Error(`Uploaded file type does not match this ${expectedKind} placeholder.`);
      }

      const now = new Date().toISOString();
      const resolvedKind = expectedKind && expectedKind !== 'file'
        ? expectedKind
        : uploadedKind;
      const updatedAsset: CaseResolverAssetFile = {
        ...currentAsset,
        folder: normalizeFolderPath(uploaded.folder || uploadFolder),
        kind: resolvedKind,
        filepath: uploaded.filepath,
        sourceFileId: uploaded.id,
        mimeType: uploaded.mimetype,
        size: uploaded.size,
        updatedAt: now,
      };
      updateWorkspace((current) => {
        let didUpdate = false;
        const nextAssets = current.assets.map((asset) => {
          if (asset.id !== assetId) return asset;
          didUpdate = true;
          return updatedAsset;
        });
        if (!didUpdate) return current;
        return {
          ...current,
          assets: nextAssets,
          folders: normalizeFolderPaths([
            ...current.folders,
            normalizeFolderPath(uploaded.folder || uploadFolder),
          ]),
        };
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(updatedAsset.id);
      toast('File attached to image placeholder.', { variant: 'success' });
      return updatedAsset;
    },
    [toast, updateWorkspace, uploadSourceFileToCaseResolver, workspace.assets]
  );

  useEffect(() => {
    if (!requestedFileId) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      return;
    }
    const requestedFileExists = workspace.files.some(
      (file: CaseResolverFile): boolean => file.id === requestedFileId
    );
    if (requestedFileExists) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      return;
    }
    if (requestedWorkspaceRefreshFileIdRef.current === requestedFileId) return;

    requestedWorkspaceRefreshFileIdRef.current = requestedFileId;
    let isCancelled = false;
    void (async (): Promise<void> => {
      const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot('case_view');
      if (!refreshedWorkspace) return;
      const refreshedHasRequestedFile = refreshedWorkspace.files.some(
        (file: CaseResolverFile): boolean => file.id === requestedFileId
      );
      if (isCancelled || !refreshedHasRequestedFile) return;

      lastPersistedValueRef.current = JSON.stringify(refreshedWorkspace);
      lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(refreshedWorkspace);
      queuedSerializedWorkspaceRef.current = null;
      queuedExpectedRevisionRef.current = null;
      queuedMutationIdRef.current = null;
      setWorkspace(refreshedWorkspace);
      handledRequestedFileIdRef.current = null;
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action: 'requested_file_refresh_applied',
        workspaceRevision: getCaseResolverWorkspaceRevision(refreshedWorkspace),
      });
    })();

    return (): void => {
      isCancelled = true;
    };
  }, [requestedFileId, workspace.files]);

  useEffect(() => {
    if (!requestedFileId) {
      handledRequestedFileIdRef.current = null;
      return;
    }
    if (handledRequestedFileIdRef.current === requestedFileId) return;
    const requestedFileExists = workspace.files.some(
      (file: CaseResolverFile): boolean => file.id === requestedFileId
    );
    if (!requestedFileExists) {
      setSelectedFileId(requestedFileId);
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      return;
    }

    handledRequestedFileIdRef.current = requestedFileId;
    setSelectedFileId(requestedFileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    updateWorkspace((current: CaseResolverWorkspace) =>
      current.activeFileId === requestedFileId
        ? current
        : {
          ...current,
          activeFileId: requestedFileId,
        }
    );
  }, [requestedFileId, updateWorkspace, workspace.files]);

  const handleDeleteFolder = useCallback((folderPath: string): void => {
    const normalizedFolder = normalizeFolderPath(folderPath);
    if (!normalizedFolder) return;
    
    confirm({
      title: 'Delete Folder?',
      message: `Are you sure you want to delete folder "${normalizedFolder}" and all nested content? This action cannot be undone.`,
      confirmText: 'Delete Folder',
      isDangerous: true,
      onConfirm: () => {
        const filesInDeletedFolder = workspace.files.filter((file: CaseResolverFile): boolean =>
          file.fileType !== 'case' && isPathWithinFolder(file.folder, normalizedFolder)
        );
        const assetsInDeletedFolder = workspace.assets.filter((asset: CaseResolverAssetFile): boolean =>
          isPathWithinFolder(asset.folder, normalizedFolder)
        );
        const removedFileIds = new Set<string>(
          filesInDeletedFolder.map((file: CaseResolverFile): string => file.id)
        );
        const removedAssetIds = new Set<string>(
          assetsInDeletedFolder.map((asset: CaseResolverAssetFile): string => asset.id)
        );

        updateWorkspace((current) => {
          const currentRemovedFileIds = new Set(
            current.files
              .filter((file) => file.fileType !== 'case' && isPathWithinFolder(file.folder, normalizedFolder))
              .map((file) => file.id)
          );
          const nextFiles = current.files.filter(
            (file) => file.fileType === 'case' || !isPathWithinFolder(file.folder, normalizedFolder)
          );
          const fallbackCaseId = (() => {
            if (!current.activeFileId || !currentRemovedFileIds.has(current.activeFileId)) {
              return null;
            }
            const removedActiveFile =
              current.files.find((file) => file.id === current.activeFileId) ?? null;
            if (!removedActiveFile?.parentCaseId) return null;
            const parentCase =
              current.files.find((file) => file.id === removedActiveFile.parentCaseId) ?? null;
            return parentCase?.fileType === 'case' ? parentCase.id : null;
          })();
          const fallbackFileId =
            nextFiles.find((file) => file.fileType !== 'case')?.id ??
            nextFiles.find((file) => file.fileType === 'case')?.id ??
            null;
          
          return {
            ...current,
            folders: current.folders.filter((path) => !isPathWithinFolder(path, normalizedFolder)),
            files: nextFiles,
            assets: current.assets.filter((asset) => !isPathWithinFolder(asset.folder, normalizedFolder)),
            activeFileId: current.activeFileId && currentRemovedFileIds.has(current.activeFileId)
              ? (fallbackCaseId ?? fallbackFileId)
              : current.activeFileId,
          };
        }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

        setSelectedFileId((current: string | null): string | null => {
          if (!current || !removedFileIds.has(current)) return current;
          const removedSelectedFile =
            workspace.files.find((file: CaseResolverFile): boolean => file.id === current) ?? null;
          if (!removedSelectedFile?.parentCaseId) return null;
          const parentCase =
            workspace.files.find(
              (file: CaseResolverFile): boolean =>
                file.id === removedSelectedFile.parentCaseId && file.fileType === 'case'
            ) ?? null;
          return parentCase?.id ?? null;
        });
        setSelectedAssetId((current: string | null): string | null =>
          current && removedAssetIds.has(current) ? null : current
        );
        setSelectedFolderPath((current: string | null): string | null =>
          current && isPathWithinFolder(current, normalizedFolder) ? null : current
        );
      }
    });
  }, [confirm, setSelectedAssetId, setSelectedFileId, setSelectedFolderPath, updateWorkspace, workspace.assets, workspace.files]);

  const handleMoveFile = useCallback(
    async (fileId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === fileId
            ? { ...file, folder: normalizedTarget, updatedAt: new Date().toISOString() }
            : file
        ),
        folders: normalizeFolderPaths(
          normalizedTarget
            ? [...current.folders, normalizedTarget]
            : current.folders
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleMoveAsset = useCallback(
    async (assetId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === assetId
            ? { ...asset, folder: normalizedTarget, updatedAt: new Date().toISOString() }
            : asset
        ),
        folders: normalizeFolderPaths(
          normalizedTarget
            ? [...current.folders, normalizedTarget]
            : current.folders
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleRenameFile = useCallback(
    async (fileId: string, nextName: string): Promise<void> => {
      const trimmedName = nextName.trim();
      if (!trimmedName) return;
      updateWorkspace((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === fileId
            ? { ...file, name: trimmedName, updatedAt: new Date().toISOString() }
            : file
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleRenameAsset = useCallback(
    async (assetId: string, nextName: string): Promise<void> => {
      const trimmedName = nextName.trim();
      if (!trimmedName) return;
      updateWorkspace((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === assetId
            ? { ...asset, name: trimmedName, updatedAt: new Date().toISOString() }
            : asset
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleRenameFolder = useCallback(
    async (folderPath: string, nextFolderPath: string): Promise<void> => {
      const normalizedSource = normalizeFolderPath(folderPath);
      const normalizedTarget = normalizeFolderPath(nextFolderPath);
      if (!normalizedSource || !normalizedTarget) return;
      if (normalizedSource === normalizedTarget) return;

      updateWorkspace((current) => {
        const now = new Date().toISOString();
        const rename = (value: string): string =>
          renameFolderPath(value, normalizedSource, normalizedTarget);

        return {
          ...current,
          folders: normalizeFolderPaths(current.folders.map(rename)),
          folderTimestamps: Object.fromEntries(
            Object.entries(current.folderTimestamps ?? {}).map(([path, timestamps]) => [
              rename(path),
              timestamps,
            ])
          ),
          files: current.files.map((file) => {
            const nextFolder = rename(file.folder);
            if (nextFolder === file.folder) return file;
            return { ...file, folder: nextFolder, updatedAt: now };
          }),
          assets: current.assets.map((asset) => {
            const nextFolder = rename(asset.folder);
            if (nextFolder === asset.folder) return asset;
            return { ...asset, folder: nextFolder, updatedAt: now };
          }),
        };
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

      setSelectedFolderPath((current) => {
        if (!current || !isPathWithinFolder(current, normalizedSource)) return current;
        return renameFolderPath(current, normalizedSource, normalizedTarget);
      });
    },
    [setSelectedFolderPath, updateWorkspace]
  );

  const handleOpenFileEditor = useCallback((fileId: string): void => {
    const target = workspace.files.find((file) => file.id === fileId);
    if (!target) {
      toast('File not found.', { variant: 'warning' });
      return;
    }
    if (target.fileType === 'case') {
      toast('Cases are edited in the Cases list. Select a document to edit.', {
        variant: 'info',
      });
      return;
    }
    const baseDraft = buildFileEditDraft(target);
    const recoveredDraft = readStoredEditorDraft(fileId);
    const canRecoverStoredDraft =
      recoveredDraft?.baseDocumentContentVersion === baseDraft.baseDocumentContentVersion;
    const nextDraft = canRecoverStoredDraft
      ? {
        ...baseDraft,
        ...recoveredDraft.draft,
        documentHistory: baseDraft.documentHistory,
      }
      : baseDraft;
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

  const handleUpdateSelectedAsset = useCallback(
    (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>): void => {
      if (!selectedAssetId) return;
      updateWorkspace((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === selectedAssetId
            ? {
              ...asset,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [selectedAssetId, updateWorkspace]
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
    const hasContentChanges =
      currentFile.activeDocumentVersion !== editingDocumentDraft.activeDocumentVersion ||
      currentFile.editorType !== canonical.mode ||
      currentFile.documentContent !== nextStoredContent ||
      currentFile.documentContentMarkdown !== canonical.markdown ||
      currentFile.documentContentHtml !== canonical.html ||
      currentFile.documentContentPlainText !== canonical.plainText ||
      JSON.stringify(currentFile.documentConversionWarnings) !== JSON.stringify(canonical.warnings) ||
      currentFile.originalDocumentContent !== nextOriginalDocumentContent ||
      currentFile.explodedDocumentContent !== nextExplodedDocumentContent;
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
      hasContentChanges;

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
          ? (() => {
            const nextDocumentHistory = hasContentChanges
              ? [
                {
                  id: createId('case-doc-history'),
                  savedAt: now,
                  documentContentVersion: file.documentContentVersion,
                  activeDocumentVersion: file.activeDocumentVersion,
                  editorType: file.editorType,
                  documentContent: file.documentContent,
                  documentContentMarkdown: file.documentContentMarkdown,
                  documentContentHtml: file.documentContentHtml,
                  documentContentPlainText: file.documentContentPlainText,
                },
                ...file.documentHistory,
              ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT)
              : file.documentHistory;
            return {
              ...file,
              ...editingDocumentDraft,
              editorType: canonical.mode,
              documentContentFormatVersion: 1,
              documentContentVersion: file.documentContentVersion + 1,
              documentContent: nextStoredContent,
              documentContentMarkdown: canonical.markdown,
              documentContentHtml: canonical.html,
              documentContentPlainText: canonical.plainText,
              documentHistory: nextDocumentHistory,
              documentConversionWarnings: canonical.warnings,
              lastContentConversionAt: now,
              originalDocumentContent: nextOriginalDocumentContent,
              explodedDocumentContent: nextExplodedDocumentContent,
              updatedAt: now,
            };
          })()
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

    updateWorkspace((current) => ({
      ...current,
      activeFileId: targetFileId,
      files: current.files.map((file) => {
        if (file.id !== targetFileId) return file;
        const nextDocumentHistory = [
          {
            id: createId('case-doc-history'),
            savedAt: now,
            documentContentVersion: file.documentContentVersion,
            activeDocumentVersion: file.activeDocumentVersion,
            editorType: file.editorType,
            documentContent: file.documentContent,
            documentContentMarkdown: file.documentContentMarkdown,
            documentContentHtml: file.documentContentHtml,
            documentContentPlainText: file.documentContentPlainText,
          },
          ...file.documentHistory,
        ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
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
          documentHistory: nextDocumentHistory,
          documentConversionWarnings: canonicalExploded.warnings,
          lastContentConversionAt: now,
          documentDate: extractedDocumentDate ?? file.documentDate,
          updatedAt: now,
        };
      }),
    }));

    setEditingDocumentDraft((current) => {
      if (current?.id !== targetFileId) return current;
      const nextVersion = current.documentContentVersion + 1;
      const nextDocumentHistory = [
        {
          id: createId('case-doc-history'),
          savedAt: now,
          documentContentVersion: current.documentContentVersion,
          activeDocumentVersion: current.activeDocumentVersion,
          editorType: current.editorType,
          documentContent: current.documentContent,
          documentContentMarkdown: current.documentContentMarkdown,
          documentContentHtml: current.documentContentHtml,
          documentContentPlainText: current.documentContentPlainText,
        },
        ...current.documentHistory,
      ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
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
        documentHistory: nextDocumentHistory,
        documentConversionWarnings: canonicalExploded.warnings,
        lastContentConversionAt: now,
        documentDate: extractedDocumentDate ?? current.documentDate,
      };
    });

    if (proposalState) {
      setPromptExploderPartyProposal(proposalState);
      setIsApplyingPromptExploderPartyProposal(false);
      if (caseResolverCaptureSettings.autoOpenProposalModal) {
        setIsPromptExploderPartyProposalOpen(true);
      }
    } else {
      setPromptExploderPartyProposal(null);
      setIsPromptExploderPartyProposalOpen(false);
      setIsApplyingPromptExploderPartyProposal(false);
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
    caseResolverSettings,
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
    handleCreateScanFile,
    handleCreateImageAsset,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleMoveFile,
    handleMoveAsset,
    handleRenameFile,
    handleRenameAsset,
    handleRenameFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    handleUpdateActiveFileParties,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    confirmAction: confirm,
    ConfirmationModal,
    PromptInputModal,
  };
}
