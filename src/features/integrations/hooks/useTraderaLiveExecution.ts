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

type LiveTraderaAction = 'list' | 'relist' | 'sync' | 'check_status';

export type LiveTraderaExecutionState = {
  runId: string;
  action: LiveTraderaAction;
  status: PlaywrightNodeRunSnapshot['status'];
  latestStage: string | null;
  latestStageUrl: string | null;
  executionSteps: TraderaExecutionStep[];
  rawResult: Record<string, unknown> | null;
  logTail: string[];
  error: string | null;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
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
    normalized === 'check_status'
  ) {
    return normalized;
  }
  return null;
};

const resolvePendingLiveTarget = (
  listing: ProductListingWithDetails | null | undefined
): {
  runId: string;
  action: LiveTraderaAction;
} | null => {
  if (!listing) return null;
  const integrationSlug = (listing.integration?.slug ?? '').trim().toLowerCase();
  if (!TRADERA_INTEGRATION_SLUGS.has(integrationSlug)) {
    return null;
  }

  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const runId = readString(pendingExecution['runId']);
  const action = normalizeLiveTraderaAction(pendingExecution['action']);

  if (!runId || !action) {
    return null;
  }

  return { runId, action };
};

const resolveLiveRunOutputs = (
  snapshot: PlaywrightNodeRunSnapshot
): {
  payload: Record<string, unknown>;
  outputs: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
} => {
  const payload = toRecord(snapshot.result);
  const outputs = toRecord(payload['outputs']);
  const nestedResult = toRecord(outputs['result']);
  const resultValue =
    Object.keys(nestedResult).length > 0
      ? nestedResult
      : Object.keys(outputs).length > 0
        ? outputs
        : payload;

  return {
    payload,
    outputs,
    resultValue,
    finalUrl: readString(payload['finalUrl']),
  };
};

const buildLiveTraderaExecutionState = (
  action: LiveTraderaAction,
  snapshot: PlaywrightNodeRunSnapshot
): LiveTraderaExecutionState => {
  const { outputs, resultValue, finalUrl } = resolveLiveRunOutputs(snapshot);
  const emittedSteps = readTraderaExecutionSteps(outputs['steps']);
  const executionSteps =
    emittedSteps.length > 0
      ? emittedSteps
      : action === 'check_status'
        ? resolveTraderaCheckStatusExecutionStepsFromResult(resultValue)
        : buildTraderaQuicklistExecutionSteps({
            action,
            rawResult: resultValue,
            logs: Array.isArray(snapshot.logs) ? snapshot.logs : [],
            errorMessage: typeof snapshot.error === 'string' ? snapshot.error : null,
          });

  return {
    runId: snapshot.runId,
    action,
    status: snapshot.status,
    latestStage: readString(resultValue['stage']),
    latestStageUrl: readString(resultValue['currentUrl']) ?? finalUrl,
    executionSteps,
    rawResult: Object.keys(resultValue).length > 0 ? resultValue : null,
    logTail: Array.isArray(snapshot.logs) ? snapshot.logs.slice(-12) : [],
    error: typeof snapshot.error === 'string' ? snapshot.error : null,
  };
};

export const useTraderaLiveExecution = (
  listing: ProductListingWithDetails | null | undefined
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
    refetchInterval: (query) => {
      if (!pendingTarget) return false;
      const run = query.state.data;
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
