/**
 * Case Resolver Folder Records Service
 * 
 * Manages the logic for resolving, validating, and building folder records
 * from workspace source data, files, and assets.
 */

import { z } from 'zod';
import type { CaseResolverAssetFile, CaseResolverFile, CaseResolverFolderRecord } from '@/shared/contracts/case-resolver/file';

/**
 * Zod schema for a Case Resolver folder record.
 */
export const FolderRecordSchema = z.object({
  path: z.string().min(1),
  ownerCaseId: z.string().min(1).nullable().optional(),
});

/**
 * Normalizes a folder path string by sanitizing characters and trimming.
 */
export const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized.split('/');
  const stack: string[] = [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '' || trimmed === '.') continue;
    if (trimmed === '..') {
      stack.pop();
    } else {
      stack.push(trimmed.replace(/[^a-zA-Z0-9-_]/g, '_'));
    }
  }
  return stack.join('/');
};

/**
 * Expands a folder path into all its sub-paths.
 */
export const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
};

/**
 * Builds a unique key for a folder record based on its path and case ID.
 */
export const buildCaseResolverFolderRecordKey = (path: string, ownerCaseId: string | null): string =>
  `${ownerCaseId ?? '__none__'}::${path}`;

/**
 * Sanitizes an optional ID string.
 */
export const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Normalizes an owner case ID against a set of valid case IDs.
 */
export const normalizeFolderRecordOwnerCaseId = (
  value: unknown,
  validCaseIds: Set<string>
): string | null => {
  const normalized = sanitizeOptionalId(value);
  if (!normalized) return null;
  return validCaseIds.has(normalized) ? normalized : null;
};

/**
 * Parses and validates folder records from raw source data.
 */
export const parseCaseResolverFolderRecords = (
  source: unknown,
  validCaseIds: Set<string>
): CaseResolverFolderRecord[] => {
  if (!Array.isArray(source)) return [];
  const records = source
    .map((entry: unknown): CaseResolverFolderRecord | null => {
      const result = FolderRecordSchema.safeParse(entry);
      if (!result.success) {
        // Fallback for path key name
        const record = entry as Record<string, unknown>;
        const pathSource = typeof record['path'] === 'string' ? record['path'] : typeof record['folder'] === 'string' ? record['folder'] : '';
        const normalizedPath = normalizeFolderPath(pathSource);
        if (!normalizedPath) return null;
        return {
          path: normalizedPath,
          ownerCaseId: normalizeFolderRecordOwnerCaseId(record['ownerCaseId'], validCaseIds),
        };
      }
      return {
        ...result.data,
        ownerCaseId: normalizeFolderRecordOwnerCaseId(result.data.ownerCaseId, validCaseIds),
      } as CaseResolverFolderRecord;
    })
    .filter((entry): entry is CaseResolverFolderRecord => Boolean(entry));
    
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

/**
 * Builds a collection of consolidated folder records from raw source data, files, and assets.
 */
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

  sourceRecords.forEach((record) => registerRecord(record.path, record.ownerCaseId ?? null));

  files.forEach((file) => {
    if (file.fileType === 'case') return;
    const ownerCaseId = fileOwnerCaseIdByFileId.get(file.id) ?? null;
    registerRecord(file.folder, ownerCaseId);
  });

  assets.forEach((asset) => {
    const sourceFileId = asset.sourceFileId?.trim() || null;
    const ownerCaseId = sourceFileId ? (fileOwnerCaseIdByFileId.get(sourceFileId) ?? null) : null;
    registerRecord(asset.folder, ownerCaseId);
  });

  return Array.from(recordsByKey.values()).sort(
    (a, b) => a.path.localeCompare(b.path) || (a.ownerCaseId ?? '').localeCompare(b.ownerCaseId ?? '')
  );
};

/**
 * Builds a mapping of file ID to owner Case ID.
 */
const buildCaseResolverFileOwnerCaseIdByFileId = (
  files: CaseResolverFile[],
  validCaseIds: Set<string>
): Map<string, string> => {
  const ownerByFileId = new Map<string, string>();
  files.forEach((file) => {
    if (file.fileType === 'case') {
      ownerByFileId.set(file.id, file.id);
    } else if (file.parentCaseId && validCaseIds.has(file.parentCaseId)) {
      ownerByFileId.set(file.id, file.parentCaseId);
    }
  });
  return ownerByFileId;
};
