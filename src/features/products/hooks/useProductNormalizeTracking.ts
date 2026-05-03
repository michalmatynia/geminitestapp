'use client';

import { useEffect, useState } from 'react';

import {
  extractNormalizeProductNameResultFromAiPathRunDetail,
  type NormalizeProductNameAiPathResult,
} from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';
import { getAiPathRunResult } from '@/shared/lib/ai-paths/api/client';
import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';

import type { NormalizeCompletionState } from '../components/ProductModals.types';

type NormalizeRunIdSetter = React.Dispatch<React.SetStateAction<string | null>>;
type NormalizeCompletionSetter = React.Dispatch<
  React.SetStateAction<NormalizeCompletionState | null>
>;
type NormalizeActiveRef = { current: boolean };

const createNormalizeResultCompletion = (
  runId: string,
  result: NormalizeProductNameAiPathResult
): NormalizeCompletionState => ({
  kind: 'result',
  runId,
  result,
});

const createNormalizeErrorCompletion = (
  runId: string,
  error: string
): NormalizeCompletionState => ({
  kind: 'error',
  runId,
  error,
});

const resolveTerminalNormalizeError = (
  snapshot: TrackedAiPathRunSnapshot,
  trackedRunId: string
): NormalizeCompletionState =>
  createNormalizeErrorCompletion(
    trackedRunId,
    snapshot.errorMessage ??
      `Normalize failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
  );

const resolveFetchedNormalizeCompletion = async (
  trackedRunId: string,
  activeRef: NormalizeActiveRef
): Promise<NormalizeCompletionState | null> => {
  const response = await getAiPathRunResult(trackedRunId, { timeoutMs: 60_000 });
  if (activeRef.current === false) {
    return null;
  }

  if (response.ok === false) {
    const error = response.error !== ''
      ? response.error
      : 'Normalize failed: unable to load the completed AI Path run result.';
    return createNormalizeErrorCompletion(trackedRunId, error);
  }

  const normalizeResult = extractNormalizeProductNameResultFromAiPathRunDetail(response.data);
  return normalizeResult !== null
    ? createNormalizeResultCompletion(trackedRunId, normalizeResult)
    : createNormalizeErrorCompletion(
        trackedRunId,
        'Normalize failed: the AI Path did not return a normalized English title.'
      );
};

const resolveCompletedNormalizeCompletion = async (
  snapshot: TrackedAiPathRunSnapshot,
  trackedRunId: string,
  activeRef: NormalizeActiveRef
): Promise<NormalizeCompletionState | null> => {
  const streamedNormalizeResult = snapshot.run !== null && snapshot.run !== undefined
    ? extractNormalizeProductNameResultFromAiPathRunDetail({ run: snapshot.run })
    : null;
  if (streamedNormalizeResult !== null) {
    return createNormalizeResultCompletion(trackedRunId, streamedNormalizeResult);
  }

  return await resolveFetchedNormalizeCompletion(trackedRunId, activeRef);
};

const resolveNormalizeCompletion = async (
  snapshot: TrackedAiPathRunSnapshot,
  trackedRunId: string,
  activeRef: NormalizeActiveRef
): Promise<NormalizeCompletionState | null> =>
  snapshot.status === 'completed'
    ? await resolveCompletedNormalizeCompletion(snapshot, trackedRunId, activeRef)
    : resolveTerminalNormalizeError(snapshot, trackedRunId);

const handleNormalizeTerminalSnapshot = async ({
  activeRef,
  setPendingNormalizeCompletion,
  setPendingNormalizeRunId,
  snapshot,
  trackedRunId,
}: {
  activeRef: NormalizeActiveRef;
  setPendingNormalizeCompletion: NormalizeCompletionSetter;
  setPendingNormalizeRunId: NormalizeRunIdSetter;
  snapshot: TrackedAiPathRunSnapshot;
  trackedRunId: string;
}): Promise<void> => {
  const completion = await resolveNormalizeCompletion(snapshot, trackedRunId, activeRef);
  if (activeRef.current === false || completion === null) {
    return;
  }

  setPendingNormalizeCompletion(completion);
  setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
};

export function useProductNormalizeTracking(args: {
  isOpen: boolean;
  shouldApplyNormalizeResultLocally: boolean;
}): {
  pendingNormalizeRunId: string | null;
  setPendingNormalizeRunId: React.Dispatch<React.SetStateAction<string | null>>;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  setPendingNormalizeCompletion: React.Dispatch<React.SetStateAction<NormalizeCompletionState | null>>;
} {
  const { isOpen, shouldApplyNormalizeResultLocally } = args;
  const [pendingNormalizeRunId, setPendingNormalizeRunId] = useState<string | null>(null);
  const [pendingNormalizeCompletion, setPendingNormalizeCompletion] =
    useState<NormalizeCompletionState | null>(null);

  useEffect(() => {
    if (pendingNormalizeRunId === null || shouldApplyNormalizeResultLocally === false) {
      return undefined;
    }

    const activeRef = { current: true };
    let terminalHandled = false;
    const trackedRunId = pendingNormalizeRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (activeRef.current === false || terminalHandled === true || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void handleNormalizeTerminalSnapshot({
        activeRef,
        setPendingNormalizeCompletion,
        setPendingNormalizeRunId,
        snapshot,
        trackedRunId,
      });
    });

    return () => {
      activeRef.current = false;
      unsubscribe();
    };
  }, [pendingNormalizeRunId, shouldApplyNormalizeResultLocally]);

  useEffect(() => {
    if (isOpen === false) {
      setPendingNormalizeRunId(null);
      setPendingNormalizeCompletion(null);
    }
  }, [isOpen]);

  return {
    pendingNormalizeRunId,
    setPendingNormalizeRunId,
    pendingNormalizeCompletion,
    setPendingNormalizeCompletion,
  };
}
