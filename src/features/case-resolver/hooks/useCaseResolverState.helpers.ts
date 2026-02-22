import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import React from 'react';
import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverFolderRecord,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import {
  createCaseResolverFile,
  expandFolderPath,
  inferCaseResolverAssetKind,
  normalizeFolderPath,
  renameFolderPath,
} from '../settings';
import { createId, isPathWithinFolder, buildFileEditDraft } from '../utils/caseResolverUtils';


const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';

export const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;
export const CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS = 900;
export const CASE_RESOLVER_OCR_JOB_TIMEOUT_MS = 120_000;

export type CaseResolverDraftCanonicalState = {
  mode: 'markdown' | 'wysiwyg';
  storedContent: string;
  markdown: string;
  html: string;
  plainText: string;
  warnings: string[];
  originalDocumentContent: string;
  explodedDocumentContent: string;
};

type StoredCaseResolverEditorDraft = {
  fileId: string;
  baseDocumentContentVersion: number;
  updatedAt: string;
  draft: Partial<CaseResolverFileEditDraft>;
};

export type WriteStoredEditorDraftResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'storage-unavailable' };

export type CaseResolverUploadedFile = {
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

const normalizeComparableReferenceCaseIds = (
  value: string[] | null | undefined
): string[] => [...(value ?? [])].sort();

const normalizeComparableWarnings = (
  value: string[] | null | undefined
): string[] => [...(value ?? [])];

type CaseResolverComparableDocumentSnapshot = {
  id: string;
  name: string;
  folder: string;
  parentCaseId: string | null;
  referenceCaseIds: string[];
  documentDate: CaseResolverFileEditDraft['documentDate'];
  documentCity: string | null;
  tagId: string | null;
  caseIdentifierId: string | null;
  categoryId: string | null;
  scanOcrModel: string;
  scanOcrPrompt: string;
  addresser: CaseResolverFileEditDraft['addresser'];
  addressee: CaseResolverFileEditDraft['addressee'];
  activeDocumentVersion: CaseResolverFileEditDraft['activeDocumentVersion'];
  editorType: CaseResolverFileEditDraft['editorType'];
  documentContentFormatVersion: 1;
  documentContent: string;
  documentContentMarkdown: string;
  documentContentHtml: string;
  documentContentPlainText: string;
  documentConversionWarnings: string[];
  originalDocumentContent: string;
  explodedDocumentContent: string;
};

export const buildCaseResolverDraftCanonicalState = (
  draft: CaseResolverFileEditDraft
): CaseResolverDraftCanonicalState => {
  const resolvedMode: 'markdown' | 'wysiwyg' =
    draft.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  const resolvedCanonicalSource = (() => {
    if (resolvedMode === 'markdown') {
      if (
        typeof draft.documentContentMarkdown === 'string' &&
        draft.documentContentMarkdown.trim().length > 0
      ) {
        return draft.documentContentMarkdown;
      }
      if (
        typeof draft.documentContentPlainText === 'string' &&
        draft.documentContentPlainText.trim().length > 0
      ) {
        return draft.documentContentPlainText;
      }
      return draft.documentContent ?? '';
    }
    if (
      typeof draft.documentContentHtml === 'string' &&
      draft.documentContentHtml.trim().length > 0
    ) {
      return draft.documentContentHtml;
    }
    if (
      typeof draft.documentContentMarkdown === 'string' &&
      draft.documentContentMarkdown.trim().length > 0
    ) {
      return ensureHtmlForPreview(draft.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(draft.documentContent ?? '');
  })();
  const canonical = deriveDocumentContentSync({
    mode: resolvedMode,
    value: resolvedCanonicalSource,
    previousHtml: draft.documentContentHtml ?? '',
    previousMarkdown: draft.documentContentMarkdown ?? '',
  });
  const storedContent = toStorageDocumentValue(canonical);
  const originalDocumentContent =
    draft.activeDocumentVersion === 'original'
      ? storedContent
      : (draft.originalDocumentContent ?? '');
  const explodedDocumentContent =
    draft.activeDocumentVersion === 'exploded'
      ? storedContent
      : (draft.explodedDocumentContent ?? '');
  return {
    mode: resolvedMode,
    storedContent,
    markdown: canonical.markdown,
    html: canonical.html,
    plainText: canonical.plainText,
    warnings: [...canonical.warnings],
    originalDocumentContent,
    explodedDocumentContent,
  };
};

const buildCaseResolverFileComparableSnapshot = (
  file: CaseResolverFile
): CaseResolverComparableDocumentSnapshot => {
  const canonicalDraft = buildFileEditDraft(file);
  const canonicalState = buildCaseResolverDraftCanonicalState(canonicalDraft);
  return {
    id: file.id,
    name: file.name,
    folder: file.folder,
    parentCaseId: file.parentCaseId ?? null,
    referenceCaseIds: normalizeComparableReferenceCaseIds(file.referenceCaseIds),
    documentDate: canonicalDraft.documentDate,
    documentCity:
      typeof canonicalDraft.documentCity === 'string'
        ? canonicalDraft.documentCity.trim() || null
        : null,
    tagId: file.tagId ?? null,
    caseIdentifierId: file.caseIdentifierId ?? null,
    categoryId: file.categoryId ?? null,
    scanOcrModel: file.scanOcrModel ?? '',
    scanOcrPrompt: file.scanOcrPrompt ?? '',
    addresser: file.addresser,
    addressee: file.addressee,
    activeDocumentVersion: canonicalDraft.activeDocumentVersion,
    editorType: canonicalState.mode,
    documentContentFormatVersion: 1,
    documentContent: canonicalState.storedContent,
    documentContentMarkdown: canonicalState.markdown,
    documentContentHtml: canonicalState.html,
    documentContentPlainText: canonicalState.plainText,
    documentConversionWarnings: normalizeComparableWarnings(canonicalState.warnings),
    originalDocumentContent: canonicalState.originalDocumentContent ?? '',
    explodedDocumentContent: canonicalState.explodedDocumentContent ?? '',
  };
};
const buildCaseResolverDraftComparableSnapshot = (
  draft: CaseResolverFileEditDraft,
  canonicalState: CaseResolverDraftCanonicalState
): CaseResolverComparableDocumentSnapshot => ({
  id: draft.id,
  name: draft.name,
  folder: draft.folder,
  parentCaseId: draft.parentCaseId ?? null,
  referenceCaseIds: normalizeComparableReferenceCaseIds(draft.referenceCaseIds),
  documentDate: draft.documentDate,
  documentCity: typeof draft.documentCity === 'string' ? draft.documentCity.trim() || null : null,
  tagId: draft.tagId ?? null,
  caseIdentifierId: draft.caseIdentifierId ?? null,
  categoryId: draft.categoryId ?? null,
  scanOcrModel: draft.scanOcrModel ?? '',
  scanOcrPrompt: draft.scanOcrPrompt ?? '',
  addresser: draft.addresser,  addressee: draft.addressee,
  activeDocumentVersion: draft.activeDocumentVersion,
  editorType: canonicalState.mode,
  documentContentFormatVersion: 1,
  documentContent: canonicalState.storedContent,
  documentContentMarkdown: canonicalState.markdown,
  documentContentHtml: canonicalState.html,
  documentContentPlainText: canonicalState.plainText,
  documentConversionWarnings: normalizeComparableWarnings(canonicalState.warnings),
  originalDocumentContent: canonicalState.originalDocumentContent ?? '',
  explodedDocumentContent: canonicalState.explodedDocumentContent ?? '',
});
export const buildCaseResolverFileComparableFingerprint = (
  file: CaseResolverFile
): string => stableStringify(buildCaseResolverFileComparableSnapshot(file));

export const buildCaseResolverDraftComparableFingerprint = (
  draft: CaseResolverFileEditDraft,
  canonicalState?: CaseResolverDraftCanonicalState
): string =>
  stableStringify(
    buildCaseResolverDraftComparableSnapshot(
      draft,
      canonicalState ?? buildCaseResolverDraftCanonicalState(draft)
    )
  );

export const hasCaseResolverDraftMeaningfulChanges = ({
  draft,
  file,
  canonicalState,
}: {
  draft: CaseResolverFileEditDraft;
  file: CaseResolverFile;
  canonicalState?: CaseResolverDraftCanonicalState;
}): boolean =>
  buildCaseResolverDraftComparableFingerprint(draft, canonicalState) !==
  buildCaseResolverFileComparableFingerprint(file);

type CaseResolverWorkspaceMutationOptions = {
  persistToast?: string;
  persistNow?: boolean;
  mutationId?: string;
  source?: string;
  skipNormalization?: boolean;
};

type CaseResolverWorkspaceUpdater = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: CaseResolverWorkspaceMutationOptions
) => void;

type CaseResolverEditingDraftUpdater = React.Dispatch<
  React.SetStateAction<CaseResolverFileEditDraft | null>
>;

const normalizeCaseResolverFileId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const idsMatchByNormalization = (
  left: string | null | undefined,
  right: string | null | undefined
): boolean => {
  const normalizedLeft = normalizeCaseResolverFileId(left);
  const normalizedRight = normalizeCaseResolverFileId(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

export const resolveCaseResolverFileById = (
  files: CaseResolverWorkspace['files'],
  candidateId: string | null | undefined
): CaseResolverFile | null => {
  const normalizedCandidateId = normalizeCaseResolverFileId(candidateId);
  if (!normalizedCandidateId) return null;
  return (
    files.find((file: CaseResolverFile): boolean => file.id === candidateId) ??
    files.find((file: CaseResolverFile): boolean => (
      normalizeCaseResolverFileId(file.id) === normalizedCandidateId
    )) ??
    null
  );
};

export type CaseResolverCaptureTargetResolution =
  | 'proposal_target'
  | 'context_target'
  | 'editing_draft'
  | 'unresolved';

export const resolveCaptureTargetFile = ({
  workspaceFiles,
  proposalTargetFileId,
  contextFileId = null,
  editingDraftFileId = null,
}: {
  workspaceFiles: CaseResolverWorkspace['files'];
  proposalTargetFileId: string | null | undefined;
  contextFileId?: string | null;
  editingDraftFileId?: string | null;
}): {
  file: CaseResolverFile | null;
  resolution: CaseResolverCaptureTargetResolution;
  resolvedTargetFileId: string | null;
} => {
  const proposalTarget = resolveCaseResolverFileById(workspaceFiles, proposalTargetFileId);
  if (proposalTarget) {
    return {
      file: proposalTarget,
      resolution: 'proposal_target',
      resolvedTargetFileId: proposalTarget.id,
    };
  }

  const contextTarget = resolveCaseResolverFileById(workspaceFiles, contextFileId);
  if (contextTarget) {
    return {
      file: contextTarget,
      resolution: 'context_target',
      resolvedTargetFileId: contextTarget.id,
    };
  }

  const editingDraftTarget = resolveCaseResolverFileById(workspaceFiles, editingDraftFileId);
  if (editingDraftTarget) {
    return {
      file: editingDraftTarget,
      resolution: 'editing_draft',
      resolvedTargetFileId: editingDraftTarget.id,
    };
  }

  return {
    file: null,
    resolution: 'unresolved',
    resolvedTargetFileId: null,
  };
};

export type CaseResolverFileMutationStage = 'precheck' | 'mutation' | null;

export const applyCaseResolverFileMutationAndRebaseDraft = ({
  fileId,
  updateWorkspace,
  setEditingDocumentDraft,
  mutate,
  source,
  persistToast,
  activateFile = false,
  skipNormalization = false,
  fallbackFileOnMissing = null,
  allowFallbackOnMissing = true,
  precheckWorkspaceFiles = null,
}: {
  fileId: string;
  updateWorkspace: CaseResolverWorkspaceUpdater;
  setEditingDocumentDraft: CaseResolverEditingDraftUpdater;
  mutate: (file: CaseResolverFile) => Partial<CaseResolverFile> | null;
  source: string;
  persistToast?: string;
  activateFile?: boolean;
  skipNormalization?: boolean;
  fallbackFileOnMissing?: CaseResolverFile | null;
  allowFallbackOnMissing?: boolean;
  precheckWorkspaceFiles?: CaseResolverWorkspace['files'] | null;
}): {
  ok: boolean;
  stage: CaseResolverFileMutationStage;
  fileFound: boolean;
  changed: boolean;
  nextFile: CaseResolverFile | null;
  resolvedTargetFileId: string | null;
} => {
  const precheckTarget = precheckWorkspaceFiles
    ? resolveCaseResolverFileById(precheckWorkspaceFiles, fileId)
    : null;
  if (precheckWorkspaceFiles && !precheckTarget) {
    return {
      ok: false,
      stage: 'precheck',
      fileFound: false,
      changed: false,
      nextFile: null,
      resolvedTargetFileId: null,
    };
  }

  let fileFound = false;
  let changed = false;
  let nextFile: CaseResolverFile | null = null;
  let resolvedTargetFileId: string | null = precheckTarget?.id ?? null;

  const mutationOptions: CaseResolverWorkspaceMutationOptions = {
    source,
    ...(persistToast ? { persistToast } : {}),
    ...(skipNormalization ? { skipNormalization: true } : {}),
  };
  const matchesTargetFileId = (candidateId: string): boolean =>
    idsMatchByNormalization(candidateId, resolvedTargetFileId ?? fileId);

  updateWorkspace((current) => {
    let localFileFound = false;
    let localChanged = false;
    let localNextFile: CaseResolverFile | null = null;
    const mutationTarget =
      resolveCaseResolverFileById(current.files, resolvedTargetFileId ?? fileId);
    let matchedFileId: string | null = mutationTarget?.id ?? null;
    let nextFiles = current.files;

    if (mutationTarget) {
      localFileFound = true;
      const patch = mutate(mutationTarget);
      if (patch) {
        const normalizedNextFile = createCaseResolverFile({
          ...mutationTarget,
          ...patch,
          createdAt:
            typeof patch.createdAt === 'string'
              ? patch.createdAt
              : (mutationTarget.createdAt || new Date().toISOString()),
          updatedAt:
            typeof patch.updatedAt === 'string'
              ? patch.updatedAt
              : (
                typeof mutationTarget.updatedAt === 'string'
                  ? mutationTarget.updatedAt
                  : (mutationTarget.createdAt || new Date().toISOString())
              ),
        });
        if (
          buildCaseResolverFileComparableFingerprint(mutationTarget) !==
          buildCaseResolverFileComparableFingerprint(normalizedNextFile)
        ) {
          localChanged = true;
          localNextFile = normalizedNextFile;
          nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => (
            file.id === mutationTarget.id ? normalizedNextFile : file
          ));
        }
      }
    }

    if (
      !localFileFound &&
      allowFallbackOnMissing &&
      fallbackFileOnMissing &&
      matchesTargetFileId(fallbackFileOnMissing.id)
    ) {
      localFileFound = true;
      matchedFileId = fallbackFileOnMissing.id;
      const patch = mutate(fallbackFileOnMissing);
      if (patch) {
        const normalizedNextFile = createCaseResolverFile({
          ...fallbackFileOnMissing,
          ...patch,
          createdAt:
            typeof patch.createdAt === 'string'
              ? patch.createdAt
              : (fallbackFileOnMissing.createdAt || new Date().toISOString()),
          updatedAt:
            typeof patch.updatedAt === 'string'
              ? patch.updatedAt
              : (
                typeof fallbackFileOnMissing.updatedAt === 'string'
                  ? fallbackFileOnMissing.updatedAt
                  : (fallbackFileOnMissing.createdAt || new Date().toISOString())
              ),
        });
        localChanged = true;
        localNextFile = normalizedNextFile;
        nextFiles = [...current.files, normalizedNextFile];
      }
    }

    fileFound = localFileFound;
    changed = localChanged;
    nextFile = localNextFile;
    if (matchedFileId) {
      resolvedTargetFileId = matchedFileId;
    }

    if (!localFileFound) return current;
    const activeTargetFileId = matchedFileId ?? fileId;
    const nextActiveFileId =
      activateFile && current.activeFileId !== activeTargetFileId
        ? activeTargetFileId
        : current.activeFileId;
    const activeFileChanged = nextActiveFileId !== current.activeFileId;
    if (!localChanged && !activeFileChanged) return current;
    return {
      ...current,
      activeFileId: nextActiveFileId,
      files: localChanged ? nextFiles : current.files,
    };
  }, mutationOptions);

  const nextFileSnapshot = nextFile;
  if (nextFileSnapshot !== null) {
    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
      if (!current) return current;
      const currentDraft = current;
      const nextSnapshot: CaseResolverFile = nextFileSnapshot;
      if (
        currentDraft.id !== nextSnapshot.id &&
        !idsMatchByNormalization(currentDraft.id, resolvedTargetFileId ?? fileId)
      ) {
        return current;
      }
      const rebasedBase = nextSnapshot;
      const rebasedDraft = buildFileEditDraft(rebasedBase);
      return {
        ...rebasedDraft,
      };    });
  }

  if (!fileFound) {
    return {
      ok: false,
      stage: 'mutation',
      fileFound: false,
      changed: false,
      nextFile: null,
      resolvedTargetFileId,
    };
  }

  return {
    ok: true,
    stage: null,
    fileFound,
    changed,
    nextFile,
    resolvedTargetFileId,
  };
};

export const readStoredEditorDraft = (fileId: string): StoredCaseResolverEditorDraft | null => {
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

const isQuotaExceededStorageError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown };
  const errorName = typeof record.name === 'string' ? record.name : '';
  const errorCode = typeof record.code === 'number' ? record.code : null;
  return (
    errorName === 'QuotaExceededError' ||
    errorName === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    errorCode === 22 ||
    errorCode === 1014
  );
};

const buildStoredEditorDraftPatch = (
  draft: CaseResolverFileEditDraft,
  mode: 'primary' | 'minimal'
): Partial<CaseResolverFileEditDraft> => {
  const primaryContentPatch: Partial<CaseResolverFileEditDraft> =
    draft.editorType === 'wysiwyg'
      ? {
        documentContentHtml: draft.documentContentHtml ?? '',
      }
      : {
        documentContentMarkdown: draft.documentContentMarkdown ?? '',
      };

  const patch = Object.fromEntries(
    Object.entries({
      name: draft.name,
      folder: draft.folder,
      parentCaseId: draft.parentCaseId,
      referenceCaseIds: [...(draft.referenceCaseIds ?? [])],
      updatedAt: draft.updatedAt,
      documentDate: draft.documentDate,
      documentCity: draft.documentCity,
      activeDocumentVersion: draft.activeDocumentVersion,
      editorType: draft.editorType,
      documentContentFormatVersion: draft.documentContentFormatVersion,
      documentContentVersion: draft.documentContentVersion,
      documentConversionWarnings: [...(draft.documentConversionWarnings ?? [])],
      lastContentConversionAt: draft.lastContentConversionAt,
      scanOcrModel: draft.scanOcrModel,
      scanOcrPrompt: draft.scanOcrPrompt,
      addresser: draft.addresser,
      addressee: draft.addressee,
      tagId: draft.tagId,
      caseIdentifierId: draft.caseIdentifierId,
      categoryId: draft.categoryId,
      // Persist scan slot topology only; OCR text can be very large and quickly exhaust quota.
      scanSlots: (draft.scanSlots ?? []).map((slot) => ({
        ...slot,
        ocrText: '',
      })),
    }).filter(([, value]) => value !== undefined)
  ) as Partial<CaseResolverFileEditDraft>;
  if (mode === 'minimal') return patch;
  return {
    ...patch,
    ...primaryContentPatch,
    originalDocumentContent: draft.originalDocumentContent ?? '',
    explodedDocumentContent: draft.explodedDocumentContent ?? '',
  };
};

const buildStoredEditorDraftPayload = (
  fileId: string,
  draft: CaseResolverFileEditDraft,
  mode: 'primary' | 'minimal'
): StoredCaseResolverEditorDraft => ({
  fileId,
  baseDocumentContentVersion: draft.baseDocumentContentVersion ?? 0,
  updatedAt: new Date().toISOString(),
  draft: buildStoredEditorDraftPatch(draft, mode),
});

const collectStoredEditorDraftKeys = (storage: Storage, keepKey: string): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const entryKey = storage.key(index);
    if (!entryKey) continue;
    if (!entryKey.startsWith(`${CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX}:`)) continue;
    if (entryKey === keepKey) continue;
    keys.push(entryKey);
  }
  return keys;
};

const removeStoredEditorDraftsExcept = (storage: Storage, keepKey: string): void => {
  const removableKeys = collectStoredEditorDraftKeys(storage, keepKey);
  removableKeys.forEach((entryKey) => {
    try {
      storage.removeItem(entryKey);
    } catch {
      // Ignore cleanup errors; we still attempt to persist the latest draft.
    }
  });
};

const tryWriteEditorDraftPayload = (
  storage: Storage,
  key: string,
  payload: StoredCaseResolverEditorDraft
): WriteStoredEditorDraftResult => {
  try {
    storage.setItem(key, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededStorageError(error)) {
      return { ok: false, reason: 'quota' };
    }
    return { ok: false, reason: 'storage-unavailable' };
  }
};

export const writeStoredEditorDraft = (
  fileId: string,
  draft: CaseResolverFileEditDraft
): WriteStoredEditorDraftResult => {
  if (typeof window === 'undefined') return { ok: true };
  const storage = window.localStorage;
  const key = buildEditorDraftStorageKey(fileId);

  const primaryWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'primary')
  );
  if (primaryWrite.ok) return primaryWrite;

  if (primaryWrite.reason !== 'quota') return primaryWrite;
  removeStoredEditorDraftsExcept(storage, key);

  const retryPrimaryWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'primary')
  );
  if (retryPrimaryWrite.ok) return retryPrimaryWrite;
  if (retryPrimaryWrite.reason !== 'quota') return retryPrimaryWrite;

  const minimalWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'minimal')
  );
  if (minimalWrite.ok) return minimalWrite;
  return { ok: false, reason: 'quota' };
};

export const clearStoredEditorDraft = (fileId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(buildEditorDraftStorageKey(fileId));
  } catch {
    // Ignore storage cleanup errors.
  }
};

export const normalizeUploadedCaseResolverFile = (
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
const PDF_FILENAME_EXTENSION_PATTERN = /\.pdf$/i;

export const isLikelyImageFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  return IMAGE_FILENAME_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyPdfFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType === 'application/pdf') return true;
  return PDF_FILENAME_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyScanInputFile = (file: File): boolean =>
  isLikelyImageFile(file) || isLikelyPdfFile(file);

export const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, durationMs));
  });

export const createPlaceholderAssetName = ({
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

export const createUniqueCaseFileName = ({
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

const buildFolderRecordKey = (path: string, ownerCaseId: string | null): string =>
  `${ownerCaseId ?? '__none__'}::${path}`;

export const normalizeFolderRecords = (
  source: CaseResolverFolderRecord[] | null | undefined
): CaseResolverFolderRecord[] => {
  if (!Array.isArray(source)) return [];
  const byKey = new Map<string, CaseResolverFolderRecord>();
  source.forEach((record: CaseResolverFolderRecord): void => {
    const normalizedPath = normalizeFolderPath(record.path);
    if (!normalizedPath) return;
    const ownerCaseId =
      typeof record.ownerCaseId === 'string' && record.ownerCaseId.trim().length > 0
        ? record.ownerCaseId.trim()
        : null;
    const key = buildFolderRecordKey(normalizedPath, ownerCaseId);
    if (byKey.has(key)) return;
    byKey.set(key, {
      path: normalizedPath,
      ownerCaseId,
    });
  });
  return Array.from(byKey.values()).sort((left: CaseResolverFolderRecord, right: CaseResolverFolderRecord) => {
    const pathDelta = left.path.localeCompare(right.path);
    if (pathDelta !== 0) return pathDelta;
    return (left.ownerCaseId ?? '').localeCompare(right.ownerCaseId ?? '');
  });
};

export const appendOwnedFolderRecords = ({
  records,
  folderPath,
  ownerCaseId,
}: {
  records: CaseResolverFolderRecord[] | null | undefined;
  folderPath: string;
  ownerCaseId: string | null;
}): CaseResolverFolderRecord[] => {
  const normalizedPath = normalizeFolderPath(folderPath);
  if (!normalizedPath) return normalizeFolderRecords(records);
  const current = normalizeFolderRecords(records);
  const byKey = new Map<string, CaseResolverFolderRecord>(
    current.map(
      (record: CaseResolverFolderRecord): [string, CaseResolverFolderRecord] => [
        buildFolderRecordKey(record.path, record.ownerCaseId ?? null),
        record,
      ]
    )
  );
  expandFolderPath(normalizedPath).forEach((path: string): void => {
    const key = buildFolderRecordKey(path, ownerCaseId);
    if (byKey.has(key)) return;
    byKey.set(key, { path, ownerCaseId });
  });
  return normalizeFolderRecords(Array.from(byKey.values()));
};

export const removeOwnedFolderRecordsWithinPath = ({
  records,
  folderPath,
  ownerCaseIds,
}: {
  records: CaseResolverFolderRecord[] | null | undefined;
  folderPath: string;
  ownerCaseIds: Set<string> | null;
}): CaseResolverFolderRecord[] => {
  const normalizedPath = normalizeFolderPath(folderPath);
  if (!normalizedPath) return normalizeFolderRecords(records);
  const current = normalizeFolderRecords(records);
  const filtered = current.filter((record: CaseResolverFolderRecord): boolean => {
    if (!isPathWithinFolder(record.path, normalizedPath)) return true;
    if (!ownerCaseIds || ownerCaseIds.size === 0) return false;
    if (!record.ownerCaseId) return true;
    return !ownerCaseIds.has(record.ownerCaseId);
  });
  return normalizeFolderRecords(filtered);
};

export const renameOwnedFolderRecordsWithinPath = ({
  records,
  sourceFolderPath,
  targetFolderPath,
  ownerCaseIds,
}: {
  records: CaseResolverFolderRecord[] | null | undefined;
  sourceFolderPath: string;
  targetFolderPath: string;
  ownerCaseIds: Set<string> | null;
}): CaseResolverFolderRecord[] => {
  const normalizedSource = normalizeFolderPath(sourceFolderPath);
  const normalizedTarget = normalizeFolderPath(targetFolderPath);
  if (!normalizedSource || !normalizedTarget) return normalizeFolderRecords(records);
  const current = normalizeFolderRecords(records);
  const renamed = current.map((record: CaseResolverFolderRecord): CaseResolverFolderRecord => {
    if (!isPathWithinFolder(record.path, normalizedSource)) return record;
    if (ownerCaseIds && ownerCaseIds.size > 0) {
      if (!record.ownerCaseId || !ownerCaseIds.has(record.ownerCaseId)) {
        return record;
      }
    }
    return {
      ...record,
      path: renameFolderPath(record.path, normalizedSource, normalizedTarget),
    };
  });
  return normalizeFolderRecords(renamed);
};

export const collectCaseScopeIds = (
  files: CaseResolverFile[],
  rootCaseId: string | null
): Set<string> | null => {
  if (!rootCaseId) return null;
  const fileById = new Map<string, CaseResolverFile>(
    files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  if (fileById.get(rootCaseId)?.fileType !== 'case') return null;

  const childCaseIdsByParentId = new Map<string, string[]>();
  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType !== 'case') return;
    const parentCaseId = file.parentCaseId;
    if (!parentCaseId || parentCaseId === file.id) return;
    const parentFile = fileById.get(parentCaseId);
    if (parentFile?.fileType !== 'case') return;
    const currentChildren = childCaseIdsByParentId.get(parentCaseId) ?? [];
    currentChildren.push(file.id);
    childCaseIdsByParentId.set(parentCaseId, currentChildren);
  });

  const scopedCaseIds = new Set<string>();
  const visitCase = (caseId: string): void => {
    if (!caseId || scopedCaseIds.has(caseId)) return;
    const caseFile = fileById.get(caseId);
    if (caseFile?.fileType !== 'case') return;
    scopedCaseIds.add(caseId);
    const children = childCaseIdsByParentId.get(caseId) ?? [];
    children.forEach((childId: string): void => visitCase(childId));
  };
  visitCase(rootCaseId);
  return scopedCaseIds.size > 0 ? scopedCaseIds : null;
};

export type CaseResolverRequestedCaseStatus = 'loading' | 'ready' | 'missing';

export const resolveCaseContainerIdForFileId = (
  filesById: Map<string, CaseResolverFile>,
  fileId: string | null
): string | null => {
  if (!fileId) return null;
  const contextFile = filesById.get(fileId) ?? null;
  if (!contextFile) return null;
  if (contextFile.fileType === 'case') return contextFile.id;
  if (!contextFile.parentCaseId) return null;
  const parentFile = filesById.get(contextFile.parentCaseId) ?? null;
  return parentFile?.fileType === 'case' ? parentFile.id : null;
};

export const resolveCaseResolverActiveCaseId = ({
  requestedFileId,
  requestedCaseContainerId,
  selectedCaseContainerId,
  files,
}: {
  requestedFileId: string | null;
  requestedCaseContainerId: string | null;
  selectedCaseContainerId: string | null;
  files: CaseResolverFile[];
}): string | null => {
  if (requestedFileId) return requestedCaseContainerId;
  if (selectedCaseContainerId) return selectedCaseContainerId;
  return (
    files.find((file: CaseResolverFile): boolean => file.fileType === 'case')?.id ??
    null
  );
};

export const isCaseResolverCreateContextReady = ({
  activeCaseId,
  requestedFileId,
  requestedCaseStatus,
}: {
  activeCaseId: string | null;
  requestedFileId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
}): boolean => {
  if (!activeCaseId) return false;
  if (!requestedFileId) return true;
  return requestedCaseStatus === 'ready';
};

export const serializeWorkspaceForUnsavedChangesCheck = (
  workspace: CaseResolverWorkspace
): string =>
  stableStringify({
    ...workspace,
    // Revision metadata is persistence bookkeeping, not user-facing edits.
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    // Keep active selection changes from triggering global unsaved-change prompts.
    activeFileId: null,
  });

const resolveUploadBucketForAssetKind = (
  kind: CaseResolverAssetKind
): 'images' | 'pdfs' | 'files' => {
  if (kind === 'image') return 'images';
  if (kind === 'pdf') return 'pdfs';
  return 'files';
};

export const resolveUploadBaseFolder = (folder: string, kind: CaseResolverAssetKind): string => {
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

export const resolveCaseScopedFolderTarget = ({
  targetFolderPath,
  ownerCaseId,
  folderRecords,
}: {
  targetFolderPath: string | null;
  ownerCaseId: string;
  folderRecords: CaseResolverFolderRecord[] | null | undefined;
}): string => {
  const normalizedTarget = normalizeFolderPath(targetFolderPath ?? '');
  if (!normalizedTarget) return '';

  const normalizedRecords = normalizeFolderRecords(folderRecords);
  const ownerPaths = new Set<string>(
    normalizedRecords
      .filter((record: CaseResolverFolderRecord): boolean => record.ownerCaseId === ownerCaseId)
      .map((record: CaseResolverFolderRecord): string => record.path)
  );

  // If the folder path already belongs to this case, keep it.
  if (ownerPaths.has(normalizedTarget)) {
    return normalizedTarget;
  }

  // If it does not belong to this case, reset to root to avoid leaking create actions
  // into a folder selected in another case.
  return '';
};
