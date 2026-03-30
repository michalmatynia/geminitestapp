import type { DbQueryConfig, PollConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { DEFAULT_DB_QUERY } from '../../constants';
import { coerceInput } from '../../utils';
import { pollDatabaseQuery, pollGraphJob } from '../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type PollFailureClassification = {
  status: 'failed' | 'timeout' | 'canceled';
  reason:
    | 'poll_timeout'
    | 'poll_job_canceled'
    | 'poll_job_not_found'
    | 'poll_connection_error'
    | 'poll_query_failed'
    | 'poll_unknown';
  retryable: boolean;
  error: string;
};

const classifyPollError = (error: unknown, mode: 'job' | 'database'): PollFailureClassification => {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return {
      status: 'timeout',
      reason: 'poll_timeout',
      retryable: true,
      error: message,
    };
  }
  if (normalized.includes('was canceled')) {
    return {
      status: 'canceled',
      reason: 'poll_job_canceled',
      retryable: false,
      error: message,
    };
  }
  if (normalized.includes('job not found')) {
    return {
      status: 'failed',
      reason: 'poll_job_not_found',
      retryable: false,
      error: message,
    };
  }
  if (normalized.includes('connection error') || normalized.includes('network')) {
    return {
      status: 'failed',
      reason: 'poll_connection_error',
      retryable: true,
      error: message,
    };
  }
  if (mode === 'database') {
    return {
      status: 'failed',
      reason: 'poll_query_failed',
      retryable: true,
      error: message,
    };
  }
  return {
    status: 'failed',
    reason: 'poll_unknown',
    retryable: true,
    error: message,
  };
};

export const handlePoll: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  deferPoll,
  executed,
  reportAiPathsError,
  abortSignal,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (deferPoll) {
    const existingStatus: string | null =
      typeof prevOutputs['status'] === 'string' ? prevOutputs['status'] : null;
    if (existingStatus === 'completed' || existingStatus === 'failed') {
      return prevOutputs;
    }
    const rawJobId: unknown = coerceInput(nodeInputs['jobId']);
    const jobId: string =
      typeof rawJobId === 'string' || typeof rawJobId === 'number' ? String(rawJobId).trim() : '';
    if (!jobId) {
      return prevOutputs;
    }
    const existingResult: unknown =
      prevOutputs['result'] !== undefined ? prevOutputs['result'] : null;
    executed.poll.add(node.id);
    return {
      result: existingResult,
      status: 'polling',
      jobId,
      bundle: {
        jobId,
        status: 'polling',
        result: existingResult,
      },
    };
  }
  const pollConfig: PollConfig = node.config?.poll ?? {
    intervalMs: 2000,
    maxAttempts: 30,
    mode: 'job',
  };
  const pollMode: 'job' | 'database' = pollConfig.mode ?? 'job';
  const rawJobId: unknown = coerceInput(nodeInputs['jobId']);
  const jobId: string =
    typeof rawJobId === 'string' || typeof rawJobId === 'number' ? String(rawJobId).trim() : '';
  if (pollMode === 'database') {
    const queryConfig: DbQueryConfig = { ...DEFAULT_DB_QUERY, ...((pollConfig.dbQuery as Partial<DbQueryConfig>) ?? {}) };
    try {
      const response: { result: unknown; status: string; bundle: Record<string, unknown> } =
        await pollDatabaseQuery(
          nodeInputs,
          {
            intervalMs: pollConfig.intervalMs ?? 2000,
            maxAttempts: pollConfig.maxAttempts ?? 30,
            dbQuery: queryConfig,
            successPath: pollConfig.successPath ?? 'status',
            successOperator: pollConfig.successOperator ?? 'equals',
            successValue: pollConfig.successValue ?? 'completed',
            resultPath: pollConfig.resultPath ?? 'result',
          },
          abortSignal ? { signal: abortSignal } : {}
        );
      return {
        result: response.result,
        status: response.status,
        jobId,
        bundle: {
          ...(response.bundle ?? {}),
          jobId,
          status: response.status,
          ...(response.status === 'timeout' ? { reason: 'poll_timeout', retryable: true } : {}),
        },
      };
    } catch (error: unknown) {
      logClientError(error);
      if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
      const classification = classifyPollError(error, 'database');
      reportAiPathsError(
        error,
        { action: 'pollDatabase', nodeId: node.id },
        'Database polling failed:'
      );
      return {
        result: null,
        status: classification.status,
        jobId,
        bundle: {
          jobId,
          status: classification.status,
          reason: classification.reason,
          retryable: classification.retryable,
          error: classification.error,
        },
      };
    }
  }
  if (!jobId) {
    return prevOutputs;
  }
  try {
    const result: unknown = await pollGraphJob(jobId, {
      intervalMs: pollConfig.intervalMs,
      maxAttempts: pollConfig.maxAttempts,
      ...(abortSignal ? { signal: abortSignal } : {}),
    });
    return {
      result,
      status: 'completed',
      jobId,
      bundle: { jobId, status: 'completed', result },
    };
  } catch (error: unknown) {
    logClientError(error);
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    const classification = classifyPollError(error, 'job');
    reportAiPathsError(
      error,
      { action: 'pollJob', jobId, nodeId: node.id },
      'AI job polling failed:'
    );
    return {
      result: null,
      status: classification.status,
      jobId,
      bundle: {
        jobId,
        status: classification.status,
        reason: classification.reason,
        retryable: classification.retryable,
        error: classification.error,
      },
    };
  }
};
