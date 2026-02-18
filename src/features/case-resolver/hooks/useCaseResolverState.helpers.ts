import {
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
} from '../types';

const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';

export const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;
export const CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS = 900;
export const CASE_RESOLVER_OCR_JOB_TIMEOUT_MS = 120_000;

type StoredCaseResolverEditorDraft = {
  fileId: string;
  baseDocumentContentVersion: number;
  updatedAt: string;
  draft: CaseResolverFileEditDraft;
};

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

export const writeStoredEditorDraft = (fileId: string, draft: CaseResolverFileEditDraft): void => {
  if (typeof window === 'undefined') return;
  const payload: StoredCaseResolverEditorDraft = {
    fileId,
    baseDocumentContentVersion: draft.baseDocumentContentVersion,
    updatedAt: new Date().toISOString(),
    draft,
  };
  window.localStorage.setItem(buildEditorDraftStorageKey(fileId), JSON.stringify(payload));
};

export const clearStoredEditorDraft = (fileId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(buildEditorDraftStorageKey(fileId));
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

export const isLikelyImageFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  return IMAGE_FILENAME_EXTENSION_PATTERN.test(file.name.trim());
};

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
