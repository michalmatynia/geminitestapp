'use client';

import { useEffect, useState } from 'react';

import { extractNormalizeProductNameResultFromAiPathRunDetail } from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';
import { getAiPathRunResult } from '@/shared/lib/ai-paths/api/client';
import { subscribeToTrackedAiPathRun } from '@/shared/lib/ai-paths/client-run-tracker';

import type { NormalizeCompletionState } from '../components/ProductModals.types';

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
    if (pendingNormalizeRunId === null || shouldApplyNormalizeResultLocally === false) return;

    const activeRef = { current: true };
    let terminalHandled = false;
    const trackedRunId = pendingNormalizeRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (activeRef.current === false || terminalHandled === true || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void (async (): Promise<void> => {
        if (snapshot.status !== 'completed') {
          if (activeRef.current === true) {
            setPendingNormalizeCompletion({
              kind: 'error',
              runId: trackedRunId,
              error:
                snapshot.errorMessage ??
                `Normalize failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`,
            });
            setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          }
          return;
        }

        const streamedNormalizeResult = snapshot.run
          ? extractNormalizeProductNameResultFromAiPathRunDetail({ run: snapshot.run })
          : null;
        if (streamedNormalizeResult !== null) {
          setPendingNormalizeCompletion({
            kind: 'result',
            runId: trackedRunId,
            result: streamedNormalizeResult,
          });
          setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const response = await getAiPathRunResult(trackedRunId, { timeoutMs: 60_000 });
        if (activeRef.current === false) return;
        if (response.ok === false) {
          setPendingNormalizeCompletion({
            kind: 'error',
            runId: trackedRunId,
            error:
              response.error !== '' ?
              response.error :
              'Normalize failed: unable to load the completed AI Path run result.',
          });
          setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const normalizeResult = extractNormalizeProductNameResultFromAiPathRunDetail(response.data);
        setPendingNormalizeCompletion(
          normalizeResult !== null
            ? {
                kind: 'result',
                runId: trackedRunId,
                result: normalizeResult,
              }
            : {
                kind: 'error',
                runId: trackedRunId,
                error: 'Normalize failed: the AI Path did not return a normalized English title.',
              }
        );
        setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
      })();
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
