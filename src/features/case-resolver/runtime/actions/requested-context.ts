import type { CaseResolverRuntimeRequestedContextSlice } from '../types';

export type RequestedContextEvent =
  | { type: 'query_changed'; requestedFileId: string | null }
  | { type: 'workspace_contains_requested' }
  | { type: 'refresh_started'; requestKey: string; startedAtMs: number }
  | { type: 'refresh_succeeded_found' }
  | { type: 'refresh_succeeded_missing' }
  | { type: 'refresh_failed' }
  | { type: 'retry' }
  | { type: 'reset' }
  | { type: 'watchdog_timeout' };

const normalizeRequestedFileId = (value: string | null | undefined): string | null => {
  const normalizedValue = value?.trim() ?? '';
  return normalizedValue.length > 0 ? normalizedValue : null;
};

export const reduceRequestedContextState = (
  currentState: CaseResolverRuntimeRequestedContextSlice,
  event: RequestedContextEvent,
): CaseResolverRuntimeRequestedContextSlice => {
  if (event.type === 'reset') {
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

  if (event.type === 'query_changed') {
    const normalizedRequestedFileId = normalizeRequestedFileId(event.requestedFileId);
    if (!normalizedRequestedFileId) {
      return {
        ...currentState,
        requestedFileId: null,
        retryTick: 0,
        status: 'idle',
        issue: null,
        inFlightRequestKey: null,
        attemptedRequestKey: null,
        startedAtMs: null,
      };
    }
    if (normalizedRequestedFileId === currentState.requestedFileId) return currentState;
    return {
      ...currentState,
      requestedFileId: normalizedRequestedFileId,
      retryTick: 0,
      status: 'loading',
      issue: null,
      inFlightRequestKey: null,
      attemptedRequestKey: null,
      startedAtMs: null,
    };
  }

  if (!currentState.requestedFileId) return currentState;

  if (event.type === 'workspace_contains_requested') {
    return {
      ...currentState,
      status: 'ready',
      issue: null,
      inFlightRequestKey: null,
      startedAtMs: null,
    };
  }

  if (event.type === 'refresh_started') {
    return {
      ...currentState,
      status: 'loading',
      issue: null,
      inFlightRequestKey: event.requestKey,
      attemptedRequestKey: event.requestKey,
      startedAtMs: event.startedAtMs,
    };
  }

  if (event.type === 'refresh_succeeded_found') {
    return {
      ...currentState,
      status: 'ready',
      issue: null,
      inFlightRequestKey: null,
      startedAtMs: null,
    };
  }

  if (event.type === 'refresh_succeeded_missing') {
    return {
      ...currentState,
      status: 'missing_not_found',
      issue: 'requested_file_missing',
      inFlightRequestKey: null,
      startedAtMs: null,
    };
  }

  if (event.type === 'refresh_failed' || event.type === 'watchdog_timeout') {
    return {
      ...currentState,
      status: 'missing_unavailable',
      issue: 'workspace_unavailable',
      inFlightRequestKey: null,
      startedAtMs: null,
    };
  }

  if (event.type === 'retry') {
    return {
      ...currentState,
      status: 'loading',
      issue: null,
      retryTick: currentState.retryTick + 1,
      inFlightRequestKey: null,
      startedAtMs: null,
    };
  }

  return currentState;
};
