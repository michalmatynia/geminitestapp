import { describe, expect, it } from 'vitest';

import {
  reduceRequestedContextState,
  type RequestedContextEvent,
} from '../runtime/actions/requested-context';

const createInitialState = () => ({
  requestedFileId: null,
  retryTick: 0,
  status: 'idle' as const,
  issue: null,
  inFlightRequestKey: null,
  attemptedRequestKey: null,
  startedAtMs: null,
});

const dispatchMany = (
  events: RequestedContextEvent[],
) => events.reduce(reduceRequestedContextState, createInitialState());

describe('Case Resolver runtime requested-context FSM', () => {
  it('moves to loading when requested file appears in query', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
    ]);
    expect(nextState.requestedFileId).toBe('case-1');
    expect(nextState.status).toBe('loading');
    expect(nextState.issue).toBeNull();
  });

  it('marks missing_not_found when refresh succeeds but target is absent', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'refresh_started', requestKey: 'case-1|0', startedAtMs: 1000 },
      { type: 'refresh_succeeded_missing' },
    ]);
    expect(nextState.status).toBe('missing_not_found');
    expect(nextState.issue).toBe('requested_file_missing');
    expect(nextState.inFlightRequestKey).toBeNull();
  });

  it('marks missing_unavailable when refresh fails', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'refresh_started', requestKey: 'case-1|0', startedAtMs: 1000 },
      { type: 'refresh_failed' },
    ]);
    expect(nextState.status).toBe('missing_unavailable');
    expect(nextState.issue).toBe('workspace_unavailable');
  });

  it('returns to ready when workspace contains requested file', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'workspace_contains_requested' },
    ]);
    expect(nextState.status).toBe('ready');
    expect(nextState.issue).toBeNull();
  });

  it('increments retry tick and returns to loading on retry', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'refresh_succeeded_missing' },
      { type: 'retry' },
    ]);
    expect(nextState.retryTick).toBe(1);
    expect(nextState.status).toBe('loading');
    expect(nextState.issue).toBeNull();
  });

  it('resets to idle state on reset event', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'refresh_started', requestKey: 'case-1|0', startedAtMs: 1000 },
      { type: 'reset' },
    ]);
    expect(nextState).toEqual(createInitialState());
  });

  it('resets retry tick on query change', () => {
    const nextState = dispatchMany([
      { type: 'query_changed', requestedFileId: 'case-1' },
      { type: 'retry' },
      { type: 'query_changed', requestedFileId: 'case-2' },
    ]);
    expect(nextState.requestedFileId).toBe('case-2');
    expect(nextState.retryTick).toBe(0);
    expect(nextState.status).toBe('loading');
  });
});
