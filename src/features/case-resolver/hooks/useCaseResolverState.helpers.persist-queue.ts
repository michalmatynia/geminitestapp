export type CaseResolverWorkspacePersistQueueStatus = 'idle' | 'queued' | 'saving' | 'retry_wait';

export type CaseResolverWorkspacePersistQueueState = {
  queuedSerializedWorkspace: string | null;
  queuedExpectedRevision: number | null;
  queuedMutationId: string | null;
  inFlightSerializedWorkspace: string | null;
  inFlightExpectedRevision: number | null;
  inFlightMutationId: string | null;
  conflictAutoRetryCount: number;
  retryScheduled: boolean;
};

export type BeginCaseResolverWorkspacePersistAttemptInput = {
  state: CaseResolverWorkspacePersistQueueState;
  lastPersistedSerialized: string;
  lastPersistedRevision: number;
  fallbackMutationId: string;
};

export type BeginCaseResolverWorkspacePersistAttemptResult = {
  nextState: CaseResolverWorkspacePersistQueueState;
  attempt: {
    serializedWorkspace: string;
    expectedRevision: number;
    mutationId: string;
  } | null;
};

export type CompleteCaseResolverWorkspacePersistConflictInput = {
  state: CaseResolverWorkspacePersistQueueState;
  serverRevision: number;
  maxAutoRetryCount: number;
};

export type CompleteCaseResolverWorkspacePersistConflictResult = {
  nextState: CaseResolverWorkspacePersistQueueState;
  exhausted: boolean;
  retryCount: number;
};

const normalizeRevision = (value: number | null | undefined): number =>
  Number.isFinite(value) && (value ?? 0) >= 0 ? Math.floor(value ?? 0) : 0;

export const createCaseResolverWorkspacePersistQueueState =
  (): CaseResolverWorkspacePersistQueueState => ({
    queuedSerializedWorkspace: null,
    queuedExpectedRevision: null,
    queuedMutationId: null,
    inFlightSerializedWorkspace: null,
    inFlightExpectedRevision: null,
    inFlightMutationId: null,
    conflictAutoRetryCount: 0,
    retryScheduled: false,
  });

export const resolveCaseResolverWorkspacePersistQueueStatus = (
  state: CaseResolverWorkspacePersistQueueState
): CaseResolverWorkspacePersistQueueStatus => {
  if (state.inFlightSerializedWorkspace) return 'saving';
  if (state.retryScheduled && state.queuedSerializedWorkspace) return 'retry_wait';
  if (state.queuedSerializedWorkspace) return 'queued';
  return 'idle';
};

export const enqueueCaseResolverWorkspacePersistMutation = (
  state: CaseResolverWorkspacePersistQueueState,
  input: {
    serializedWorkspace: string;
    expectedRevision: number;
    mutationId: string;
  }
): CaseResolverWorkspacePersistQueueState => ({
  ...state,
  queuedSerializedWorkspace: input.serializedWorkspace,
  queuedExpectedRevision: normalizeRevision(input.expectedRevision),
  queuedMutationId: input.mutationId.trim() || null,
  retryScheduled: false,
});

export const clearCaseResolverWorkspacePersistQueue = (
  state: CaseResolverWorkspacePersistQueueState
): CaseResolverWorkspacePersistQueueState => ({
  ...state,
  queuedSerializedWorkspace: null,
  queuedExpectedRevision: null,
  queuedMutationId: null,
  retryScheduled: false,
});

export const beginCaseResolverWorkspacePersistAttempt = ({
  state,
  lastPersistedSerialized,
  lastPersistedRevision,
  fallbackMutationId,
}: BeginCaseResolverWorkspacePersistAttemptInput): BeginCaseResolverWorkspacePersistAttemptResult => {
  if (state.inFlightSerializedWorkspace) {
    return {
      nextState: state,
      attempt: null,
    };
  }

  const queuedSerializedWorkspace = state.queuedSerializedWorkspace;
  if (!queuedSerializedWorkspace || queuedSerializedWorkspace === lastPersistedSerialized) {
    return {
      nextState: clearCaseResolverWorkspacePersistQueue({
        ...state,
        conflictAutoRetryCount: 0,
      }),
      attempt: null,
    };
  }

  const expectedRevision =
    state.queuedExpectedRevision === null
      ? normalizeRevision(lastPersistedRevision)
      : normalizeRevision(state.queuedExpectedRevision);
  const mutationId = state.queuedMutationId?.trim() || fallbackMutationId;
  return {
    nextState: {
      ...state,
      queuedSerializedWorkspace: null,
      queuedExpectedRevision: null,
      queuedMutationId: null,
      inFlightSerializedWorkspace: queuedSerializedWorkspace,
      inFlightExpectedRevision: expectedRevision,
      inFlightMutationId: mutationId,
      retryScheduled: false,
    },
    attempt: {
      serializedWorkspace: queuedSerializedWorkspace,
      expectedRevision,
      mutationId,
    },
  };
};

export const completeCaseResolverWorkspacePersistAttemptSuccess = (
  state: CaseResolverWorkspacePersistQueueState,
  input: { persistedRevision: number }
): CaseResolverWorkspacePersistQueueState => {
  const hasQueuedMutation = Boolean(state.queuedSerializedWorkspace);
  return {
    ...state,
    inFlightSerializedWorkspace: null,
    inFlightExpectedRevision: null,
    inFlightMutationId: null,
    queuedExpectedRevision: hasQueuedMutation
      ? normalizeRevision(input.persistedRevision)
      : state.queuedExpectedRevision,
    conflictAutoRetryCount: 0,
    retryScheduled: false,
  };
};

export const completeCaseResolverWorkspacePersistAttemptConflict = ({
  state,
  serverRevision,
  maxAutoRetryCount,
}: CompleteCaseResolverWorkspacePersistConflictInput): CompleteCaseResolverWorkspacePersistConflictResult => {
  const nextRetryCount = state.conflictAutoRetryCount + 1;
  const exhausted = nextRetryCount > maxAutoRetryCount;
  if (exhausted) {
    return {
      nextState: {
        ...state,
        inFlightSerializedWorkspace: null,
        inFlightExpectedRevision: null,
        inFlightMutationId: null,
        conflictAutoRetryCount: 0,
        retryScheduled: false,
      },
      exhausted: true,
      retryCount: nextRetryCount,
    };
  }

  const retrySerializedWorkspace =
    state.queuedSerializedWorkspace ?? state.inFlightSerializedWorkspace;
  const retryMutationId =
    (state.queuedMutationId?.trim() || null) ?? (state.inFlightMutationId?.trim() || null);

  return {
    nextState: {
      ...state,
      queuedSerializedWorkspace: retrySerializedWorkspace ?? null,
      queuedExpectedRevision: normalizeRevision(serverRevision),
      queuedMutationId: retryMutationId,
      inFlightSerializedWorkspace: null,
      inFlightExpectedRevision: null,
      inFlightMutationId: null,
      conflictAutoRetryCount: nextRetryCount,
      retryScheduled: true,
    },
    exhausted: false,
    retryCount: nextRetryCount,
  };
};

export const completeCaseResolverWorkspacePersistAttemptFailure = (
  state: CaseResolverWorkspacePersistQueueState
): CaseResolverWorkspacePersistQueueState => ({
  ...state,
  inFlightSerializedWorkspace: null,
  inFlightExpectedRevision: null,
  inFlightMutationId: null,
  conflictAutoRetryCount: 0,
  retryScheduled: false,
});
