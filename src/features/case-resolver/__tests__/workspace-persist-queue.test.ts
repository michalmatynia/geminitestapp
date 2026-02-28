import { describe, expect, it } from 'vitest';

import {
  beginCaseResolverWorkspacePersistAttempt,
  clearCaseResolverWorkspacePersistQueue,
  completeCaseResolverWorkspacePersistAttemptConflict,
  completeCaseResolverWorkspacePersistAttemptFailure,
  completeCaseResolverWorkspacePersistAttemptSuccess,
  createCaseResolverWorkspacePersistQueueState,
  enqueueCaseResolverWorkspacePersistMutation,
  resolveCaseResolverWorkspacePersistQueueStatus,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers.persist-queue';

describe('case resolver workspace persist queue', () => {
  it('starts attempt only for queued workspace that differs from persisted snapshot', () => {
    const initialState = createCaseResolverWorkspacePersistQueueState();
    const queuedState = enqueueCaseResolverWorkspacePersistMutation(initialState, {
      serializedWorkspace: '{"workspaceRevision":1}',
      expectedRevision: 0,
      mutationId: 'mutation-1',
    });
    const attemptResult = beginCaseResolverWorkspacePersistAttempt({
      state: queuedState,
      lastPersistedSerialized: '{"workspaceRevision":0}',
      lastPersistedRevision: 0,
      fallbackMutationId: 'fallback-mutation',
    });

    expect(attemptResult.attempt).toEqual({
      serializedWorkspace: '{"workspaceRevision":1}',
      expectedRevision: 0,
      mutationId: 'mutation-1',
    });
    expect(resolveCaseResolverWorkspacePersistQueueStatus(attemptResult.nextState)).toBe('saving');

    const dedupedResult = beginCaseResolverWorkspacePersistAttempt({
      state: enqueueCaseResolverWorkspacePersistMutation(initialState, {
        serializedWorkspace: '{"workspaceRevision":5}',
        expectedRevision: 4,
        mutationId: 'mutation-5',
      }),
      lastPersistedSerialized: '{"workspaceRevision":5}',
      lastPersistedRevision: 5,
      fallbackMutationId: 'fallback-mutation',
    });
    expect(dedupedResult.attempt).toBeNull();
    expect(resolveCaseResolverWorkspacePersistQueueStatus(dedupedResult.nextState)).toBe('idle');
  });

  it('keeps queued mutation and updates expected revision after success', () => {
    const queueState = {
      ...createCaseResolverWorkspacePersistQueueState(),
      queuedSerializedWorkspace: '{"workspaceRevision":3}',
      queuedExpectedRevision: 2,
      queuedMutationId: 'mutation-3',
      inFlightSerializedWorkspace: '{"workspaceRevision":2}',
      inFlightExpectedRevision: 1,
      inFlightMutationId: 'mutation-2',
      conflictAutoRetryCount: 2,
    };

    const nextState = completeCaseResolverWorkspacePersistAttemptSuccess(queueState, {
      persistedRevision: 2,
    });

    expect(nextState.inFlightSerializedWorkspace).toBeNull();
    expect(nextState.queuedSerializedWorkspace).toBe('{"workspaceRevision":3}');
    expect(nextState.queuedExpectedRevision).toBe(2);
    expect(nextState.conflictAutoRetryCount).toBe(0);
    expect(resolveCaseResolverWorkspacePersistQueueStatus(nextState)).toBe('queued');
  });

  it('prefers newest queued mutation on conflict retry and marks retry_wait', () => {
    const queueState = {
      ...createCaseResolverWorkspacePersistQueueState(),
      queuedSerializedWorkspace: '{"workspaceRevision":4}',
      queuedExpectedRevision: 3,
      queuedMutationId: 'mutation-4',
      inFlightSerializedWorkspace: '{"workspaceRevision":3}',
      inFlightExpectedRevision: 2,
      inFlightMutationId: 'mutation-3',
      conflictAutoRetryCount: 0,
    };

    const conflictResult = completeCaseResolverWorkspacePersistAttemptConflict({
      state: queueState,
      serverRevision: 3,
      maxAutoRetryCount: 5,
    });

    expect(conflictResult.exhausted).toBe(false);
    expect(conflictResult.retryCount).toBe(1);
    expect(conflictResult.nextState.queuedSerializedWorkspace).toBe('{"workspaceRevision":4}');
    expect(conflictResult.nextState.queuedMutationId).toBe('mutation-4');
    expect(conflictResult.nextState.queuedExpectedRevision).toBe(3);
    expect(resolveCaseResolverWorkspacePersistQueueStatus(conflictResult.nextState)).toBe(
      'retry_wait'
    );
  });

  it('marks exhausted retries and clears in-flight state', () => {
    const queueState = {
      ...createCaseResolverWorkspacePersistQueueState(),
      inFlightSerializedWorkspace: '{"workspaceRevision":3}',
      inFlightExpectedRevision: 2,
      inFlightMutationId: 'mutation-3',
      conflictAutoRetryCount: 5,
    };
    const conflictResult = completeCaseResolverWorkspacePersistAttemptConflict({
      state: queueState,
      serverRevision: 3,
      maxAutoRetryCount: 5,
    });
    expect(conflictResult.exhausted).toBe(true);
    expect(conflictResult.retryCount).toBe(6);
    expect(conflictResult.nextState.inFlightSerializedWorkspace).toBeNull();
    expect(conflictResult.nextState.conflictAutoRetryCount).toBe(0);
  });

  it('can clear queue and recover from failures without dropping queued mutation', () => {
    const queueState = {
      ...createCaseResolverWorkspacePersistQueueState(),
      queuedSerializedWorkspace: '{"workspaceRevision":8}',
      queuedExpectedRevision: 7,
      queuedMutationId: 'mutation-8',
      inFlightSerializedWorkspace: '{"workspaceRevision":7}',
      inFlightExpectedRevision: 6,
      inFlightMutationId: 'mutation-7',
      conflictAutoRetryCount: 3,
    };
    const failedState = completeCaseResolverWorkspacePersistAttemptFailure(queueState);
    expect(failedState.inFlightSerializedWorkspace).toBeNull();
    expect(failedState.queuedSerializedWorkspace).toBe('{"workspaceRevision":8}');
    expect(failedState.conflictAutoRetryCount).toBe(0);

    const clearedState = clearCaseResolverWorkspacePersistQueue(failedState);
    expect(resolveCaseResolverWorkspacePersistQueueStatus(clearedState)).toBe('idle');
    expect(clearedState.queuedSerializedWorkspace).toBeNull();
    expect(clearedState.queuedMutationId).toBeNull();
  });
});
