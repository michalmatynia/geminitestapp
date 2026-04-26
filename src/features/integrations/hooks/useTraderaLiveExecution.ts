'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  buildTraderaQuicklistExecutionSteps,
  readTraderaExecutionSteps,
  resolveTraderaCheckStatusExecutionStepsFromResult,
} from '@/features/integrations/utils/tradera-execution-steps';
import type {
  ProductListingWithDetails,
  TraderaExecutionStep,
} from '@/shared/contracts/integrations/listings';
import {
  fetchPlaywrightRun,
  type PlaywrightNodeRunSnapshot,
} from '@/shared/lib/ai-paths/api/client/agent';

export type LiveTraderaAction = 'list' | 'relist' | 'sync' | 'check_status' | 'move_to_unsold';

type DirectTraderaLiveExecutionTarget = {
  runId: string;
  action?: LiveTraderaAction | null | undefined;
};

type TraderaLiveExecutionSource =
  | ProductListingWithDetails
  | DirectTraderaLiveExecutionTarget
  | null
  | undefined;

type PendingTraderaLiveTarget = {
  runId: string;
  action: LiveTraderaAction;
};

export type LiveTraderaExecutionState = {
  runId: string;
  action: LiveTraderaAction;
  status: PlaywrightNodeRunSnapshot['status'];
  latestStage: string | null;
  latestStageUrl: string | null;
  requestedSelectorProfile: string | null;
  resolvedSelectorProfile: string | null;
  executionSteps: TraderaExecutionStep[];
  rawResult: Record<string, unknown> | null;
  logTail: string[];
  failureArtifacts: PlaywrightNodeRunSnapshot['artifacts'];
  runtimePosture: Record<string, unknown> | null;
  error: string | null;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeLiveTraderaAction = (value: unknown): LiveTraderaAction | null => {
  const normalized = readString(value)?.toLowerCase();
  if (
    normalized === 'list' ||
    normalized === 'relist' ||
    normalized === 'sync' ||
    normalized === 'check_status' ||
    normalized === 'move_to_unsold'
  ) {
    return normalized;
  }
  return null;
};

const isTraderaListingSource = (
  value: TraderaLiveExecutionSource
): value is ProductListingWithDetails => {
  const record = toRecord(value);
  const integration = toRecord(record['integration']);
  return readString(integration['slug']) !== null;
};

const resolveDirectLiveTarget = (
  value: TraderaLiveExecutionSource
): PendingTraderaLiveTarget | null => {
  const directTarget = toRecord(value);
  const directRunId = readString(directTarget['runId']);
  if (directRunId !== null) {
    return {
      runId: directRunId,
      action: normalizeLiveTraderaAction(directTarget['action']) ?? 'list',
    };
  }
  return null;
};

const resolveListingLiveTarget = (
  listing: ProductListingWithDetails
): PendingTraderaLiveTarget | null => {
  const integrationSlug = listing.integration.slug.trim().toLowerCase();
  if (!TRADERA_INTEGRATION_SLUGS.has(integrationSlug)) {
    return null;
  }

  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const runId = readString(pendingExecution['runId']);
  const action = normalizeLiveTraderaAction(pendingExecution['action']);

  if (runId === null || action === null) {
    return null;
  }

  return { runId, action };
};

const resolvePendingLiveTarget = (
  listing: TraderaLiveExecutionSource
): PendingTraderaLiveTarget | null => {
  if (listing === null || listing === undefined) return null;

  const directTarget = resolveDirectLiveTarget(listing);
  if (directTarget !== null) return directTarget;

  return isTraderaListingSource(listing) ? resolveListingLiveTarget(listing) : null;
};

const resolveLiveRunOutputs = (
  snapshot: PlaywrightNodeRunSnapshot
): {
  payload: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
  runtimePosture: Record<string, unknown> | null;
} => {
  const payload = toRecord(snapshot.result);
  const outputs = toRecord(payload['outputs']);
  const metadata = toRecord(outputs['metadata'] ?? payload['metadata']);
  const nestedResult = toRecord(outputs['result']);
  let resultValue = payload;
  if (Object.keys(nestedResult).length > 0) {
    resultValue = nestedResult;
  } else if (Object.keys(outputs).length > 0) {
    resultValue = outputs;
  }
  const runtimePosture = toRecord(payload['runtimePosture']);

  return {
    payload,
    outputs,
    metadata,
    resultValue,
    finalUrl: readString(payload['finalUrl']),
    runtimePosture: Object.keys(runtimePosture).length > 0 ? runtimePosture : null,
  };
};

const resolveExecutionSteps = ({
  action,
  resultValue,
  outputs,
  logs,
  error,
}: {
  action: LiveTraderaAction;
  resultValue: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs: string[];
  error: string | null;
}): TraderaExecutionStep[] => {
  const emittedSteps = readTraderaExecutionSteps(outputs['steps']);
  if (emittedSteps.length > 0) return emittedSteps;

  const rawExecutionSteps = readTraderaExecutionSteps(resultValue['executionSteps']);
  if (action === 'check_status') {
    return resolveTraderaCheckStatusExecutionStepsFromResult(resultValue);
  }
  if (action === 'move_to_unsold') {
    return rawExecutionSteps;
  }

  return buildTraderaQuicklistExecutionSteps({
    action,
    rawResult: resultValue,
    logs,
    errorMessage: error,
  });
};

const buildLiveTraderaExecutionState = (
  action: LiveTraderaAction,
  snapshot: PlaywrightNodeRunSnapshot
): LiveTraderaExecutionState => {
  const { outputs, metadata, resultValue, finalUrl, runtimePosture } =
    resolveLiveRunOutputs(snapshot);
  const logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  const error = typeof snapshot.error === 'string' ? snapshot.error : null;
  const executionSteps = resolveExecutionSteps({
    action,
    resultValue,
    outputs,
    logs,
    error,
  });

  return {
    runId: snapshot.runId,
    action,
    status: snapshot.status,
    latestStage: readString(resultValue['stage']),
    latestStageUrl: readString(resultValue['currentUrl']) ?? finalUrl,
    requestedSelectorProfile:
      readString(metadata['selectorProfileRequested']) ??
      readString(resultValue['selectorProfileRequested']),
    resolvedSelectorProfile:
      readString(metadata['selectorProfileResolved']) ??
      readString(resultValue['selectorProfileResolved']),
    executionSteps,
    rawResult: Object.keys(resultValue).length > 0 ? resultValue : null,
    logTail: logs.slice(-12),
    failureArtifacts: snapshot.artifacts,
    runtimePosture,
    error,
  };
};

export const useTraderaLiveExecution = (
  listing: TraderaLiveExecutionSource
): LiveTraderaExecutionState | null => {
  const pendingTarget = useMemo(() => resolvePendingLiveTarget(listing), [listing]);

  const query = useQuery({
    queryKey: ['integrations', 'tradera', 'live-execution', pendingTarget?.runId ?? 'none'],
    enabled: Boolean(pendingTarget),
    queryFn: async (): Promise<PlaywrightNodeRunSnapshot | null> => {
      if (!pendingTarget) return null;
      const response = await fetchPlaywrightRun(pendingTarget.runId);
      return response.ok ? response.data.run : null;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (activeQuery) => {
      if (!pendingTarget) return false;
      const run = activeQuery.state.data;
      return !run || run.status === 'queued' || run.status === 'running' ? 1_000 : false;
    },
    refetchIntervalInBackground: false,
    retry: false,
  });

  return useMemo(() => {
    if (!pendingTarget || !query.data) {
      return null;
    }

    return buildLiveTraderaExecutionState(pendingTarget.action, query.data);
  }, [pendingTarget, query.data]);
};
