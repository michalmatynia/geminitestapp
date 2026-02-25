import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { CaseResolverRequestedCaseIssue } from '../types';

const normalizeRequestedFileId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

export const hasRequestedCaseFile = (
  files: CaseResolverFile[],
  requestedFileId: string | null | undefined,
): boolean => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  if (!normalizedRequestedFileId) return false;
  return files.some(
    (file: CaseResolverFile): boolean => file.id === normalizedRequestedFileId,
  );
};

export const resolveRequestedCaseIssueAfterRefresh = ({
  refreshSucceeded,
  hasRequestedFileAfterRefresh,
}: {
  refreshSucceeded: boolean;
  hasRequestedFileAfterRefresh: boolean;
}): CaseResolverRequestedCaseIssue | null => {
  if (!refreshSucceeded) return 'workspace_unavailable';
  if (hasRequestedFileAfterRefresh) return null;
  return 'requested_file_missing';
};

export const stripCaseContextQueryParams = (search: string): string => {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  params.delete('fileId');
  params.delete('openEditor');
  params.delete('promptExploderSessionId');
  return params.toString();
};
