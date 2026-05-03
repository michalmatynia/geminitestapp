import { extractParameterValueInferenceResultFromAiPathRunDetail } from '@/features/products/lib/extractParameterValueInferenceFromAiPathRunDetail';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';

import {
  normalizeInferredParameterValue,
  resolveAppliedInferredValue,
} from './ProductFormParameters.helpers';
import type { ParameterValueInferenceTrackedRun } from './ProductFormParameters.types';

type ParameterValueInferenceRunDetail = {
  run: unknown;
  nodes: unknown[];
  events: unknown[];
};

const RUN_DETAIL_LOAD_ERROR =
  'Parameter inference failed: unable to load the completed AI Path run details.';

const buildTerminalSnapshotError = (snapshot: TrackedAiPathRunSnapshot): Error => {
  if (snapshot.errorMessage !== null) {
    return new Error(snapshot.errorMessage);
  }
  return new Error(
    `Parameter inference failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
  );
};

const loadCompletedRunDetail = async (
  runId: string
): Promise<ParameterValueInferenceRunDetail> => {
  let response: Awaited<ReturnType<typeof getAiPathRun>>;
  try {
    response = await getAiPathRun(runId, { timeoutMs: 60_000 });
  } catch {
    throw new Error(RUN_DETAIL_LOAD_ERROR);
  }

  if (!response.ok) {
    throw new Error(response.error.length > 0 ? response.error : RUN_DETAIL_LOAD_ERROR);
  }
  return response.data;
};

const extractCompletedRunValue = async (
  trackedRun: ParameterValueInferenceTrackedRun
): Promise<string> => {
  const data = await loadCompletedRunDetail(trackedRun.runId);
  const result = extractParameterValueInferenceResultFromAiPathRunDetail(data);
  if (result === null) {
    throw new Error('Parameter inference failed: the AI Path did not return a parameter value.');
  }

  if (result.parameterId !== null && result.parameterId !== trackedRun.parameterId) {
    throw new Error(
      'Parameter inference failed: the AI Path returned a value for a different parameter.'
    );
  }

  const normalizedValue = normalizeInferredParameterValue({
    value: result.value,
    selectorType: trackedRun.selectorType,
    optionLabels: trackedRun.optionLabels,
  });
  if (normalizedValue === null) {
    throw new Error(
      'Parameter inference failed: the AI Path returned a value outside the allowed options.'
    );
  }

  return resolveAppliedInferredValue({
    normalizedValue,
    selectorType: trackedRun.selectorType,
    fallbackValue: trackedRun.fallbackValue,
  });
};

const handleTerminalSnapshot = async (
  trackedRun: ParameterValueInferenceTrackedRun,
  snapshot: TrackedAiPathRunSnapshot
): Promise<string> => {
  if (snapshot.status !== 'completed') throw buildTerminalSnapshotError(snapshot);
  return extractCompletedRunValue(trackedRun);
};

export const waitForParameterValueInferenceRun = (
  trackedRun: ParameterValueInferenceTrackedRun
): Promise<string> =>
  new Promise<string>((resolve, reject): void => {
    let unsubscribe: (() => void) | null = null;
    let terminalHandled = false;

    const cleanup = (): void => {
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    unsubscribe = subscribeToTrackedAiPathRun(trackedRun.runId, (snapshot) => {
      if (terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;
      void handleTerminalSnapshot(trackedRun, snapshot)
        .then(resolve)
        .catch(reject)
        .finally(cleanup);
    });
  });
