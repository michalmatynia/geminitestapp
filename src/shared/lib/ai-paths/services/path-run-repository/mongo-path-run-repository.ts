import 'server-only';

import {
  AI_PATHS_MONGO_INDEXES,
  claimRunForProcessing,
  createRun,
  createRunEvent,
  createRunNodes,
  deleteRun,
  deleteRuns,
  findNextQueuedRunId,
  findRunById,
  getQueueStats,
  getRunByRequestId,
  listRunEvents,
  listRunNodes,
  listRunNodesSince,
  listRuns,
  markStaleRunningRuns,
  updateRun,
  updateRunIfStatus,
  upsertRunNode,
  writeFinalizedRunState,
} from './methods';

import type {
  AiPathRunEventCreateInput,
  AiPathRunRepository,
  AiPathRunStatus,
} from '@/shared/contracts/ai-paths';

export { AI_PATHS_MONGO_INDEXES };

export const mongoPathRunRepository: AiPathRunRepository = {
  claimRunForProcessing,
  createRun,
  createRunEvent,
  createRunNodes,
  deleteRun,
  deleteRuns,
  findRunById,
  getRunByRequestId,
  getQueueStats,
  listRunEvents,
  listRunNodes,
  listRunNodesSince,
  listRuns,
  markStaleRunningRuns,
  upsertRunNode,
  updateRun,
  updateRunIfStatus,

  async claimNextQueuedRun() {
    const nextRunId = await findNextQueuedRunId();
    return nextRunId ? mongoPathRunRepository.claimRunForProcessing(nextRunId) : null;
  },

  async finalizeRun(
    runId: string,
    status: AiPathRunStatus,
    options?: {
      errorMessage?: string | null;
      event?: Omit<AiPathRunEventCreateInput, 'runId'>;
      finishedAt?: string | null;
    }
  ) {
    await writeFinalizedRunState(runId, status, options);

    if (options?.event) {
      await this.createRunEvent({
        ...options.event,
        runId,
      });
    }
  },
};
