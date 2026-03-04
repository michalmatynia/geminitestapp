import type { CaseResolverFile, CaseResolverFolderRecord } from '@/shared/contracts/case-resolver';
import { expandFolderPath, normalizeFolderPath, renameFolderPath } from '../settings';
import { isPathWithinFolder } from '@/features/case-resolver/utils/caseResolverUtils';

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
  return Array.from(byKey.values()).sort(
    (left: CaseResolverFolderRecord, right: CaseResolverFolderRecord) => {
      const pathDelta = left.path.localeCompare(right.path);
      if (pathDelta !== 0) return pathDelta;
      return (left.ownerCaseId ?? '').localeCompare(right.ownerCaseId ?? '');
    }
  );
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
    current.map((record: CaseResolverFolderRecord): [string, CaseResolverFolderRecord] => [
      buildFolderRecordKey(record.path, record.ownerCaseId ?? null),
      record,
    ])
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

export const resolveCaseContainerIdForFolderPath = ({
  filesById,
  folderRecords,
  folderPath,
}: {
  filesById: Map<string, CaseResolverFile>;
  folderRecords: CaseResolverFolderRecord[] | null | undefined;
  folderPath: string | null;
}): string | null => {
  const normalizedFolderPath = normalizeFolderPath(folderPath ?? '');
  if (!normalizedFolderPath) return null;

  const ownerCaseIds = normalizeFolderRecords(folderRecords)
    .filter((record: CaseResolverFolderRecord): boolean => record.path === normalizedFolderPath)
    .map((record: CaseResolverFolderRecord): string => record.ownerCaseId?.trim() ?? '')
    .filter((ownerCaseId: string): boolean => {
      if (!ownerCaseId) return false;
      return filesById.get(ownerCaseId)?.fileType === 'case';
    });
  const uniqueOwnerCaseIds = Array.from(new Set(ownerCaseIds));
  return uniqueOwnerCaseIds.length === 1 ? uniqueOwnerCaseIds[0] : null;
};

export const resolveCaseResolverActiveCaseId = ({
  requestedFileId,
  requestedCaseContainerId,
  selectedCaseContainerId,
  selectedFolderCaseContainerId,
  files: _files,
}: {
  requestedFileId: string | null;
  requestedCaseContainerId: string | null;
  selectedCaseContainerId: string | null;
  selectedFolderCaseContainerId?: string | null;
  files: CaseResolverFile[];
}): string | null => {
  if (requestedFileId) return requestedCaseContainerId;
  if (selectedCaseContainerId) return selectedCaseContainerId;
  if (selectedFolderCaseContainerId) return selectedFolderCaseContainerId;
  return null;
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
