/**
 * Workspace Normalization Service
 *
 * Provides services for normalizing, validating, and repairing CaseResolver workspaces.
 */

import type {
  CaseResolverFile,
  CaseResolverFileType,
} from '@/shared/contracts/case-resolver';
import { createCaseResolverFile } from '../../settings.files';
import { normalizeCaseResolverFileType } from '../../settings.helpers';

/**
 * Normalizes a single file record.
 */
export const normalizeFileRecord = (
  file: CaseResolverFile,
  id: string,
  normalizedCreatedAt: string,
  normalizedUpdatedAt: string
): CaseResolverFile | null => {
  const normalizedFileType: CaseResolverFileType = normalizeCaseResolverFileType(file.fileType);
  try {
    return createCaseResolverFile({
      ...file,
      id,
      fileType: normalizedFileType,
      createdAt: normalizedCreatedAt,
      updatedAt: normalizedUpdatedAt,
    }) as unknown as CaseResolverFile;
  } catch (error) {
    return null;
  }
};

/**
 * Resolves safe parent case ID, preventing circular references.
 */
export const resolveSafeCaseParentId = (
  caseId: string,
  fileType: CaseResolverFileType,
  parentCaseId: string | null,
  caseMap: Map<string, CaseResolverFile>
): string | null => {
  if (fileType !== 'case') {
    return parentCaseId && caseMap.has(parentCaseId) ? parentCaseId : null;
  }
  const candidateParentId = resolveParentCaseCandidate(caseId, parentCaseId, caseMap);
  if (!candidateParentId) return null;
  const parentFile = caseMap.get(candidateParentId);
  return parentFile?.fileType !== 'case' || hasCircularCaseParentChain(caseId, candidateParentId, caseMap)
    ? null
    : candidateParentId;
};

const resolveParentCaseCandidate = (
  caseId: string,
  parentCaseId: string | null,
  caseMap: Map<string, CaseResolverFile>
): string | null => {
  if (!parentCaseId || parentCaseId === caseId) return null;
  const parentCase = caseMap.get(parentCaseId);
  return parentCase?.fileType === 'case' ? parentCaseId : null;
};

const hasCircularCaseParentChain = (
  caseId: string,
  parentCaseId: string,
  caseMap: Map<string, CaseResolverFile>
): boolean => {
  let current: string | null = parentCaseId;
  const visited = new Set<string>();
  while (current) {
    if (current === caseId || visited.has(current)) return true;
    visited.add(current);
    const parent = caseMap.get(current);
    if (parent?.fileType !== 'case') return true;
    current = parent.parentCaseId ?? null;
  }
  return false;
};
