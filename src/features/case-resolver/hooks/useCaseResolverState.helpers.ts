import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';

import {
  createCaseResolverFile,
  expandFolderPath,
  inferCaseResolverAssetKind,
  normalizeFolderPath,
  renameFolderPath,
} from '../settings';
import { createId, isPathWithinFolder } from '../utils/caseResolverUtils';

import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverFolderRecord,
  CaseResolverWorkspace,
} from '../types';

const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';

export const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;
export const CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS = 900;
export const CASE_RESOLVER_OCR_JOB_TIMEOUT_MS = 120_000;

export type CaseResolverDraftCanonicalState = {
  mode: 'wysiwyg';
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
  documentDate: string;
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
  const resolvedHtmlContent = (() => {
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
    mode: 'wysiwyg',
    value: resolvedHtmlContent,
    previousHtml: resolvedHtmlContent,
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
    mode: 'wysiwyg',
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
): CaseResolverComparableDocumentSnapshot => ({
  id: file.id,
  name: file.name,
  folder: file.folder,
  parentCaseId: file.parentCaseId,
  referenceCaseIds: normalizeComparableReferenceCaseIds(file.referenceCaseIds),
  documentDate: file.documentDate,
  tagId: file.tagId,
  caseIdentifierId: file.caseIdentifierId,
  categoryId: file.categoryId,
  scanOcrModel: file.scanOcrModel,
  scanOcrPrompt: file.scanOcrPrompt,
  addresser: file.addresser,
  addressee: file.addressee,
  activeDocumentVersion: file.activeDocumentVersion,
  editorType: file.editorType,
  documentContentFormatVersion: 1,
  documentContent: file.documentContent,
  documentContentMarkdown: file.documentContentMarkdown,
  documentContentHtml: file.documentContentHtml,
  documentContentPlainText: file.documentContentPlainText,
  documentConversionWarnings: normalizeComparableWarnings(file.documentConversionWarnings),
  originalDocumentContent: file.originalDocumentContent,
  explodedDocumentContent: file.explodedDocumentContent,
});

const buildCaseResolverDraftComparableSnapshot = (
  draft: CaseResolverFileEditDraft,
  canonicalState: CaseResolverDraftCanonicalState
): CaseResolverComparableDocumentSnapshot => ({
  id: draft.id,
  name: draft.name,
  folder: draft.folder,
  parentCaseId: draft.parentCaseId,
  referenceCaseIds: normalizeComparableReferenceCaseIds(draft.referenceCaseIds),
  documentDate: draft.documentDate,
  tagId: draft.tagId,
  caseIdentifierId: draft.caseIdentifierId,
  categoryId: draft.categoryId,
  scanOcrModel: draft.scanOcrModel,
  scanOcrPrompt: draft.scanOcrPrompt,
  addresser: draft.addresser,
  addressee: draft.addressee,
  activeDocumentVersion: draft.activeDocumentVersion,
  editorType: canonicalState.mode,
  documentContentFormatVersion: 1,
  documentContent: canonicalState.storedContent,
  documentContentMarkdown: canonicalState.markdown,
  documentContentHtml: canonicalState.html,
  documentContentPlainText: canonicalState.plainText,
  documentConversionWarnings: normalizeComparableWarnings(canonicalState.warnings),
  originalDocumentContent: canonicalState.originalDocumentContent,
  explodedDocumentContent: canonicalState.explodedDocumentContent,
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
  mutationId?: string;
  source?: string;
};

type CaseResolverWorkspaceUpdater = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: CaseResolverWorkspaceMutationOptions
) => void;

type CaseResolverEditingDraftUpdater = (
  updater: (current: CaseResolverFileEditDraft | null) => CaseResolverFileEditDraft | null
) => void;

export const applyCaseResolverFileMutationAndRebaseDraft = ({
  fileId,
  updateWorkspace,
  setEditingDocumentDraft,
  mutate,
  source,
  persistToast,
  activateFile = false,
}: {
  fileId: string;
  updateWorkspace: CaseResolverWorkspaceUpdater;
  setEditingDocumentDraft: CaseResolverEditingDraftUpdater;
  mutate: (file: CaseResolverFile) => Partial<CaseResolverFile> | null;
  source: string;
  persistToast?: string;
  activateFile?: boolean;
}): {
  fileFound: boolean;
  changed: boolean;
  nextFile: CaseResolverFile | null;
} => {
  let fileFound = false;
  let changed = false;
  let nextFile: CaseResolverFile | null = null;

  const mutationOptions: CaseResolverWorkspaceMutationOptions = {
    source,
    ...(persistToast ? { persistToast } : {}),
  };

  updateWorkspace((current) => {
    let localFileFound = false;
    let localChanged = false;
    let localNextFile: CaseResolverFile | null = null;
    const nextFiles = current.files.map((file) => {
      if (file.id !== fileId) return file;
      localFileFound = true;
      const patch = mutate(file);
      if (!patch) return file;
      const normalizedNextFile = createCaseResolverFile({
        ...file,
        ...patch,
        createdAt:
          typeof patch.createdAt === 'string' ? patch.createdAt : file.createdAt,
        updatedAt:
          typeof patch.updatedAt === 'string'
            ? patch.updatedAt
            : (typeof file.updatedAt === 'string' ? file.updatedAt : file.createdAt),
      });
      if (
        buildCaseResolverFileComparableFingerprint(file) ===
        buildCaseResolverFileComparableFingerprint(normalizedNextFile)
      ) {
        return file;
      }
      localChanged = true;
      localNextFile = normalizedNextFile;
      return normalizedNextFile;
    });

    fileFound = localFileFound;
    changed = localChanged;
    nextFile = localNextFile;

    if (!localFileFound) return current;
    const nextActiveFileId =
      activateFile && current.activeFileId !== fileId ? fileId : current.activeFileId;
    const activeFileChanged = nextActiveFileId !== current.activeFileId;
    if (!localChanged && !activeFileChanged) return current;
    return {
      ...current,
      activeFileId: nextActiveFileId,
      files: localChanged ? nextFiles : current.files,
    };
  }, mutationOptions);

  const nextFileSnapshot = nextFile;
  if (nextFileSnapshot) {
    setEditingDocumentDraft((current) => {
      if (current?.id !== fileId) return current;
      const rebasedDraft = {
        ...(nextFileSnapshot as CaseResolverFile),
        baseDocumentContentVersion: (nextFileSnapshot as CaseResolverFile).documentContentVersion,
      } as CaseResolverFileEditDraft;
      return {
        ...rebasedDraft,
      };
    });
  }

  return {
    fileFound,
    changed,
    nextFile,
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
  baseDocumentContentVersion: draft.baseDocumentContentVersion,
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
        buildFolderRecordKey(record.path, record.ownerCaseId),
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
  JSON.stringify({
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
