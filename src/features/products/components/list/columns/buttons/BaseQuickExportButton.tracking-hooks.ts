'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

import { TERMINAL_EXPORT_RUN_STATUSES } from './BaseQuickExportButton.constants';
import {
  clearPersistedBaseQuickExportFeedback,
  persistBaseQuickExportFeedback,
  readPersistedBaseQuickExportFeedback,
} from './BaseQuickExportButton.persistence';
import type {
  ClearAuthoritativeBadgeInput,
  PersistedFeedbackEffectInput,
  SnapshotHandlerInput,
  StartTrackingInput,
  TrackedExportRunRefs,
  TrackedExportStatusState,
} from './BaseQuickExportButton.tracking-types';
import {
  normalizeTrackingString,
  resolveInitialSnapshotStatus,
  shouldClearStoppedNonTerminalRun,
  shouldResumePersistedRun,
  shouldStopTrackingSnapshot,
} from './BaseQuickExportButton.tracking-utils';

export const useTrackedExportRunRefs = (): TrackedExportRunRefs => {
  const trackedExportRunIdRef = useRef<string | null>(null);
  const trackedExportRunUnsubscribeRef = useRef<(() => void) | null>(null);

  const getTrackedExportRunId = useCallback((): string | null => trackedExportRunIdRef.current, []);
  const setTrackedExportRunId = useCallback((runId: string | null): void => {
    trackedExportRunIdRef.current = runId;
  }, []);
  const setTrackedExportRunUnsubscribe = useCallback((unsubscribe: (() => void) | null): void => {
    trackedExportRunUnsubscribeRef.current = unsubscribe;
  }, []);
  const stopTrackingExportRun = useCallback((): void => {
    trackedExportRunUnsubscribeRef.current?.();
    trackedExportRunUnsubscribeRef.current = null;
    trackedExportRunIdRef.current = null;
  }, []);

  return {
    getTrackedExportRunId,
    setTrackedExportRunId,
    setTrackedExportRunUnsubscribe,
    stopTrackingExportRun,
  };
};

export const useTrackedExportStatusState = (productId: string): TrackedExportStatusState => {
  const [trackedExportRunStatus, setTrackedExportRunStatus] =
    useState<TriggerButtonRunFeedbackStatus | null>(null);
  const [trackedExportRunContextId, setTrackedExportRunContextId] = useState<string | null>(null);
  const [trackedExportRunErrorMessage, setTrackedExportRunErrorMessage] = useState<string | null>(
    null
  );
  const setTrackedExportStatus = useCallback(
    (
      status: TriggerButtonRunFeedbackStatus | null,
      options?: { runId?: string | null; errorMessage?: string | null }
    ): void => {
      setTrackedExportRunStatus(status);
      if (status === null) {
        setTrackedExportRunContextId(null);
        setTrackedExportRunErrorMessage(null);
        clearPersistedBaseQuickExportFeedback(productId);
        return;
      }
      const runId = normalizeTrackingString(options?.runId);
      const errorMessage = normalizeTrackingString(options?.errorMessage);
      setTrackedExportRunContextId(runId);
      setTrackedExportRunErrorMessage(errorMessage);
      persistBaseQuickExportFeedback(productId, runId, status, errorMessage);
    },
    [productId]
  );

  return {
    trackedExportRunStatus,
    trackedExportRunContextId,
    trackedExportRunErrorMessage,
    setTrackedExportRunStatus,
    setTrackedExportRunContextId,
    setTrackedExportRunErrorMessage,
    setTrackedExportStatus,
  };
};

export const useStopTrackingOnUnmount = (stopTrackingExportRun: () => void): void => {
  useEffect(
    () => () => {
      stopTrackingExportRun();
    },
    [stopTrackingExportRun]
  );
};

export const usePersistedBaseQuickExportFeedbackEffect = ({
  productId,
  setTrackedExportRunId,
  setTrackedExportRunStatus,
  setTrackedExportRunContextId,
  setTrackedExportRunErrorMessage,
  startTrackingExportRun,
}: PersistedFeedbackEffectInput): void => {
  useEffect(() => {
    const persistedFeedback = readPersistedBaseQuickExportFeedback(productId);
    if (persistedFeedback === null) return;

    setTrackedExportRunId(persistedFeedback.runId);
    setTrackedExportRunStatus(persistedFeedback.status);
    setTrackedExportRunContextId(persistedFeedback.runId);
    setTrackedExportRunErrorMessage(persistedFeedback.errorMessage ?? null);
    if (persistedFeedback.runId !== null && shouldResumePersistedRun(persistedFeedback)) {
      startTrackingExportRun(persistedFeedback.runId, persistedFeedback.status);
    }
  }, [
    productId,
    setTrackedExportRunContextId,
    setTrackedExportRunErrorMessage,
    setTrackedExportRunId,
    setTrackedExportRunStatus,
    startTrackingExportRun,
  ]);
};

export const useClearTrackedExportOnAuthoritativeBadge = ({
  showMarketplaceBadge,
  trackedExportRunStatus,
  stopTrackingExportRun,
  setTrackedExportStatus,
}: ClearAuthoritativeBadgeInput): void => {
  useEffect(() => {
    if (showMarketplaceBadge === false) return;
    if (trackedExportRunStatus === null) return;
    if (TERMINAL_EXPORT_RUN_STATUSES.has(trackedExportRunStatus) === false) return;
    stopTrackingExportRun();
    setTrackedExportStatus(null);
  }, [setTrackedExportStatus, showMarketplaceBadge, stopTrackingExportRun, trackedExportRunStatus]);
};

export const useTrackedExportSnapshotHandler = ({
  getTrackedExportRunId,
  stopTrackingExportRun,
  setTrackedExportStatus,
}: SnapshotHandlerInput): ((runId: string, snapshot: TrackedAiPathRunSnapshot) => void) =>
  useCallback(
    (runId: string, snapshot: TrackedAiPathRunSnapshot): void => {
      if (getTrackedExportRunId() !== runId) return;
      if (shouldClearStoppedNonTerminalRun(snapshot)) {
        stopTrackingExportRun();
        setTrackedExportStatus(null);
        return;
      }
      setTrackedExportStatus(snapshot.status, { runId, errorMessage: snapshot.errorMessage });
      if (shouldStopTrackingSnapshot(snapshot)) stopTrackingExportRun();
    },
    [getTrackedExportRunId, setTrackedExportStatus, stopTrackingExportRun]
  );

export const useStartTrackingExportRun = ({
  productId,
  getTrackedExportRunId,
  setTrackedExportRunId,
  setTrackedExportRunUnsubscribe,
  stopTrackingExportRun,
  setTrackedExportStatus,
  handleTrackedExportRunSnapshot,
}: StartTrackingInput): ((runId: string, initialStatus: TriggerButtonRunFeedbackStatus) => void) =>
  useCallback(
    (runId: string, initialStatus: TriggerButtonRunFeedbackStatus): void => {
      const normalizedRunId = normalizeTrackingString(runId);
      if (normalizedRunId === null) {
        setTrackedExportStatus(initialStatus, { runId: null });
        return;
      }
      if (getTrackedExportRunId() !== normalizedRunId) {
        stopTrackingExportRun();
        setTrackedExportRunId(normalizedRunId);
      }
      setTrackedExportStatus(initialStatus, { runId: normalizedRunId });
      if (TERMINAL_EXPORT_RUN_STATUSES.has(initialStatus)) {
        stopTrackingExportRun();
        return;
      }
      setTrackedExportRunUnsubscribe(
        subscribeToTrackedAiPathRun(
          normalizedRunId,
          (snapshot: TrackedAiPathRunSnapshot): void => {
            handleTrackedExportRunSnapshot(normalizedRunId, snapshot);
          },
          {
            initialSnapshot: {
              runId: normalizedRunId,
              status: resolveInitialSnapshotStatus(initialStatus) as AiPathRunRecord['status'],
              entityId: productId,
              entityType: 'product',
            },
          }
        )
      );
    },
    [
      getTrackedExportRunId,
      handleTrackedExportRunSnapshot,
      productId,
      setTrackedExportRunId,
      setTrackedExportRunUnsubscribe,
      setTrackedExportStatus,
      stopTrackingExportRun,
    ]
  );
