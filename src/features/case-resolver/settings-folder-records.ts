import type { CaseResolverAssetFile, CaseResolverFile, CaseResolverFolderRecord } from './types';

const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_: string, index: number) => parts.slice(0, index + 1).join('/'));
};

const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildCaseResolverFolderRecordKey = (
  path: string,
  ownerCaseId: string | null
): string => `${ownerCaseId ?? '__none__'}::${path}`;

const normalizeFolderRecordOwnerCaseId = (
  value: unknown,
  validCaseIds: Set<string>
): string | null => {
  const normalized = sanitizeOptionalId(value);
  if (!normalized) return null;
  return validCaseIds.has(normalized) ? normalized : null;
};

export const parseCaseResolverFolderRecords = (
  source: unknown,
  validCaseIds: Set<string>
): CaseResolverFolderRecord[] => {
  if (!Array.isArray(source)) return [];
  const records = source
    .map((entry: unknown): CaseResolverFolderRecord | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const pathSource =
        typeof record['path'] === 'string'
          ? record['path']
          : typeof record['folder'] === 'string'
            ? record['folder']
            : '';
      const normalizedPath = normalizeFolderPath(pathSource);
      if (!normalizedPath) return null;
      return {
        path: normalizedPath,
        ownerCaseId: normalizeFolderRecordOwnerCaseId(record['ownerCaseId'], validCaseIds),
      };
    })
    .filter(
      (entry: CaseResolverFolderRecord | null): entry is CaseResolverFolderRecord =>
        Boolean(entry)
    );
  const ownedPaths = new Set<string>(
    records
      .filter((record: CaseResolverFolderRecord): boolean => Boolean(record.ownerCaseId))
      .map((record: CaseResolverFolderRecord): string => record.path)
  );
  return records.filter(
    (record: CaseResolverFolderRecord): boolean =>
      Boolean(record.ownerCaseId) || !ownedPaths.has(record.path)
  );
};

const buildCaseResolverFileOwnerCaseIdByFileId = (
  files: CaseResolverFile[],
  validCaseIds: Set<string>
): Map<string, string> => {
  const ownerByFileId = new Map<string, string>();
  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') {
      ownerByFileId.set(file.id, file.id);
      return;
    }
    if (!file.parentCaseId || !validCaseIds.has(file.parentCaseId)) return;
    ownerByFileId.set(file.id, file.parentCaseId);
  });
  return ownerByFileId;
};

export const buildCaseResolverFolderRecords = ({
  sourceRecords,
  files,
  assets,
  validCaseIds,
}: {
  sourceRecords: CaseResolverFolderRecord[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  validCaseIds: Set<string>;
}): CaseResolverFolderRecord[] => {
  const fileOwnerCaseIdByFileId = buildCaseResolverFileOwnerCaseIdByFileId(files, validCaseIds);

  const recordsByKey = new Map<string, CaseResolverFolderRecord>();
  const registerRecord = (path: string, ownerCaseId: string | null): void => {
    const normalizedPath = normalizeFolderPath(path);
    if (!normalizedPath) return;
    expandFolderPath(normalizedPath).forEach((expandedPath: string): void => {
      const key = buildCaseResolverFolderRecordKey(expandedPath, ownerCaseId);
      if (recordsByKey.has(key)) return;
      recordsByKey.set(key, {
        path: expandedPath,
        ownerCaseId,
      });
    });
  };

  sourceRecords.forEach((record: CaseResolverFolderRecord): void => {
    registerRecord(record.path, record.ownerCaseId);
  });

  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    const ownerCaseId = fileOwnerCaseIdByFileId.get(file.id) ?? null;
    registerRecord(file.folder, ownerCaseId);
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    const sourceFileId =
      typeof asset.sourceFileId === 'string' && asset.sourceFileId.trim().length > 0
        ? asset.sourceFileId.trim()
        : null;
    const ownerCaseId = sourceFileId ? fileOwnerCaseIdByFileId.get(sourceFileId) ?? null : null;
    registerRecord(asset.folder, ownerCaseId);
  });

  return Array.from(recordsByKey.values()).sort((left: CaseResolverFolderRecord, right: CaseResolverFolderRecord) => {
    const pathDelta = left.path.localeCompare(right.path);
    if (pathDelta !== 0) return pathDelta;
    return (left.ownerCaseId ?? '').localeCompare(right.ownerCaseId ?? '');
  });
};
