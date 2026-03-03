import type { UserPreferences } from '@/shared/contracts/auth';
import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { type CaseListViewDefaults } from './types';

export const CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS = 15;
export const CASE_RESOLVER_CASE_READY_INTERVAL_MS = 1200;

export const DEFAULT_CASE_LIST_VIEW_DEFAULTS: CaseListViewDefaults = {
  viewMode: 'hierarchy',
  sortBy: 'updated',
  sortOrder: 'desc',
  searchScope: 'all',
  filtersCollapsedByDefault: true,
  showNestedContent: true,
};

export const resolveCaseTreeOrderValue = (file: CaseResolverFile): number =>
  typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;

export const compareCaseSiblings = (left: CaseResolverFile, right: CaseResolverFile): number => {
  const orderDelta = resolveCaseTreeOrderValue(left) - resolveCaseTreeOrderValue(right);
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = left.name.localeCompare(right.name);
  if (nameDelta !== 0) return nameDelta;
  return left.id.localeCompare(right.id);
};

export const normalizeCaseParentId = (
  file: CaseResolverFile,
  caseFilesById: Map<string, CaseResolverFile>
): string | null => {
  const rawParentCaseId = file.parentCaseId?.trim() ?? '';
  if (!rawParentCaseId) return null;
  if (rawParentCaseId === file.id) return null;
  if (!caseFilesById.has(rawParentCaseId)) return null;
  return rawParentCaseId;
};

export const getSortedSiblingIds = (
  caseFilesById: Map<string, CaseResolverFile>,
  parentCaseId: string | null,
  options?: {
    excludeCaseId?: string | null;
    parentOverrideByCaseId?: Map<string, string | null>;
  }
): string[] => {
  const excludedCaseId = options?.excludeCaseId ?? null;
  const parentOverrides = options?.parentOverrideByCaseId ?? null;
  return Array.from(caseFilesById.values())
    .filter((file: CaseResolverFile): boolean => {
      if (excludedCaseId && file.id === excludedCaseId) return false;
      const resolvedParentCaseId = parentOverrides?.has(file.id)
        ? (parentOverrides.get(file.id) ?? null)
        : normalizeCaseParentId(file, caseFilesById);
      return resolvedParentCaseId === parentCaseId;
    })
    .sort(compareCaseSiblings)
    .map((file: CaseResolverFile): string => file.id);
};

export const assignSiblingCaseOrder = (
  caseFilesById: Map<string, CaseResolverFile>,
  orderedCaseIds: string[]
): void => {
  orderedCaseIds.forEach((caseId: string, index: number): void => {
    const candidate = caseFilesById.get(caseId);
    if (!candidate) return;
    candidate.caseTreeOrder = index;
  });
};

export const isDescendantCaseId = (
  caseFilesById: Map<string, CaseResolverFile>,
  candidateCaseId: string,
  ancestorCaseId: string
): boolean => {
  let currentCaseId: string | null = candidateCaseId;
  const seen = new Set<string>();

  while (currentCaseId && !seen.has(currentCaseId)) {
    seen.add(currentCaseId);
    if (currentCaseId === ancestorCaseId) return true;
    const currentCase = caseFilesById.get(currentCaseId);
    if (!currentCase) return false;
    currentCaseId = normalizeCaseParentId(currentCase, caseFilesById);
  }
  return false;
};

export const normalizeCaseListViewDefaults = (
  preferences?: UserPreferences
): CaseListViewDefaults => ({
  viewMode: preferences?.caseResolverCaseListViewMode === 'list' ? 'list' : 'hierarchy',
  sortBy:
    preferences?.caseResolverCaseListSortBy === 'created' ||
    preferences?.caseResolverCaseListSortBy === 'happeningDate' ||
    preferences?.caseResolverCaseListSortBy === 'name' ||
    preferences?.caseResolverCaseListSortBy === 'status' ||
    preferences?.caseResolverCaseListSortBy === 'signature' ||
    preferences?.caseResolverCaseListSortBy === 'locked' ||
    preferences?.caseResolverCaseListSortBy === 'sent'
      ? preferences.caseResolverCaseListSortBy
      : 'updated',
  sortOrder: preferences?.caseResolverCaseListSortOrder === 'asc' ? 'asc' : 'desc',
  searchScope:
    preferences?.caseResolverCaseListSearchScope === 'name' ||
    preferences?.caseResolverCaseListSearchScope === 'folder' ||
    preferences?.caseResolverCaseListSearchScope === 'content'
      ? preferences.caseResolverCaseListSearchScope
      : 'all',
  filtersCollapsedByDefault: preferences?.caseResolverCaseListFiltersCollapsedByDefault ?? true,
  showNestedContent: preferences?.caseResolverCaseListShowNestedContent ?? true,
});

export const getCaseResolverWorkspaceRevision = (workspace: {
  workspaceRevision?: unknown;
}): number => {
  const candidate = workspace.workspaceRevision;
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return 0;
  if (candidate <= 0) return 0;
  return Math.floor(candidate);
};

export const isPlaceholderCaseResolverWorkspace = (workspace: CaseResolverWorkspace): boolean => {
  const hasContent =
    workspace.files.length > 0 ||
    workspace.assets.length > 0 ||
    workspace.folders.length > 0 ||
    (workspace.folderRecords?.length ?? 0) > 0;
  if (hasContent) return false;
  const normalizedWorkspaceId = workspace.id.trim().toLowerCase();
  return normalizedWorkspaceId === '' || normalizedWorkspaceId === 'empty';
};

export const shouldAdoptIncomingCaseResolverCasesWorkspace = ({
  current,
  incoming,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
}): boolean => {
  const currentCaseCount = current.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  ).length;
  const incomingCaseCount = incoming.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  ).length;
  const currentRevision = getCaseResolverWorkspaceRevision(current);
  const incomingRevision = getCaseResolverWorkspaceRevision(incoming);
  if (incomingRevision > currentRevision) return true;

  const currentIsPlaceholder = isPlaceholderCaseResolverWorkspace(current);
  const incomingIsPlaceholder = isPlaceholderCaseResolverWorkspace(incoming);
  if (currentIsPlaceholder && !incomingIsPlaceholder) return true;
  if (incomingRevision === currentRevision && currentIsPlaceholder && !incomingIsPlaceholder) {
    return true;
  }
  if (incomingRevision === currentRevision && incomingCaseCount > currentCaseCount) {
    return true;
  }

  return false;
};

export const shouldBootstrapCaseResolverCasesFromRecord = (
  workspace: CaseResolverWorkspace
): boolean => {
  if (isPlaceholderCaseResolverWorkspace(workspace)) return true;
  const caseCount = workspace.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  ).length;
  return caseCount === 0;
};
