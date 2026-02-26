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

export const buildRequestedContextRequestKey = (
  requestedFileId: string,
  retryTick: number,
): string => `${requestedFileId.trim()}|${retryTick}`;

export const shouldStartRequestedContextFetch = ({
  currentRequestKey,
  attemptedRequestKey,
  inFlightRequestKey,
  currentStatus,
}: {
  currentRequestKey: string;
  attemptedRequestKey: string | null;
  inFlightRequestKey: string | null;
  currentStatus: 'loading' | 'ready' | 'missing';
}): boolean => {
  if (!currentRequestKey.trim()) return false;
  if (attemptedRequestKey !== currentRequestKey) return true;
  if (inFlightRequestKey === currentRequestKey) return false;
  return currentStatus === 'loading';
};

export const hasValidRequestedContextInFlight = ({
  currentRequestKey,
  inFlightRequestKey,
  startedAtMs,
  nowMs,
  watchdogMs,
}: {
  currentRequestKey: string;
  inFlightRequestKey: string | null;
  startedAtMs: number | null;
  nowMs: number;
  watchdogMs: number;
}): boolean => {
  if (inFlightRequestKey !== currentRequestKey) return false;
  if (typeof startedAtMs !== 'number' || !Number.isFinite(startedAtMs)) return false;
  if (startedAtMs <= 0) return false;
  return nowMs - startedAtMs <= watchdogMs;
};

export const shouldQueueRequestedContextAutoClear = ({
  requestedFileId,
  requestedCaseStatus,
  requestedCaseIssue,
  requestKey,
  lastQueuedRequestKey,
}: {
  requestedFileId: string | null | undefined;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  requestedCaseIssue: CaseResolverRequestedCaseIssue | null;
  requestKey: string | null | undefined;
  lastQueuedRequestKey: string | null;
}): boolean => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  const normalizedRequestKey = typeof requestKey === 'string' ? requestKey.trim() : '';
  if (!normalizedRequestedFileId || !normalizedRequestKey) return false;
  if (requestedCaseStatus !== 'missing' || requestedCaseIssue !== 'requested_file_missing') {
    return false;
  }
  return normalizedRequestKey !== lastQueuedRequestKey;
};
