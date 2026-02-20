import type {
  DbQueryConfig,
  PollConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
} from '@/shared/contracts/ai-paths-runtime';

import { DEFAULT_DB_QUERY } from '../../constants';
import { coerceInput } from '../../utils';
import {
  pollDatabaseQuery,
  pollGraphJob,
} from '../utils';

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
      typeof rawJobId === 'string' || typeof rawJobId === 'number'
        ? String(rawJobId).trim()
        : '';
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
    typeof rawJobId === 'string' || typeof rawJobId === 'number'
      ? String(rawJobId).trim()
      : '';
  if (pollMode === 'database') {
    const queryConfig: DbQueryConfig =
      { ...DEFAULT_DB_QUERY, ...(pollConfig.dbQuery ?? {}) };
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
        },
      };
    } catch (error: unknown) {
      if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
      reportAiPathsError(
        error,
        { action: 'pollDatabase', nodeId: node.id },
        'Database polling failed:',
      );
      return {
        result: null,
        status: 'failed',
        jobId,
        bundle: {
          jobId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Polling failed',
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
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'pollJob', jobId, nodeId: node.id },
      'AI job polling failed:',
    );
    return {
      result: null,
      status: 'failed',
      jobId,
      bundle: {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Polling failed',
      },
    };
  }
};
