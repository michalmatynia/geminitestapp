import type { CaseResolverRuntimeRequestedContextSlice } from '../../runtime';
import type { CaseResolverRequestedCaseStatus } from '@/shared/contracts/case-resolver/base';

export const mapRequestedContextRuntimeToStatus = (
  status: CaseResolverRuntimeRequestedContextSlice['status']
): CaseResolverRequestedCaseStatus => {
  if (status === 'loading') return 'loading';
  if (status === 'missing_not_found' || status === 'missing_unavailable') {
    return 'missing';
  }
  return 'ready';
};

export const createInitialRequestedContextRuntimeState = (
  requestedFileId: string | null
): CaseResolverRuntimeRequestedContextSlice => {
  const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
  if (!normalizedRequestedFileId) {
    return {
      requestedFileId: null,
      retryTick: 0,
      status: 'idle',
      issue: null,
      inFlightRequestKey: null,
      attemptedRequestKey: null,
      startedAtMs: null,
    };
  }
  return {
    requestedFileId: normalizedRequestedFileId,
    retryTick: 0,
    status: 'loading',
    issue: null,
    inFlightRequestKey: null,
    attemptedRequestKey: null,
    startedAtMs: null,
  };
};
