import 'server-only';

import { enqueueBaseImportRunJob } from '@/features/integrations/workers/baseImportQueue';
import type { BaseImportRunRecord, BaseImportStartResponse } from '@/shared/contracts/integrations';

import {
  prepareBaseImportRun,
  toStartResponse,
  updateBaseImportRunQueueJob,
  type StartBaseImportRunInput,
} from './base-import-service';

export const startBaseImportRun = async (
  input: StartBaseImportRunInput
): Promise<BaseImportRunRecord> => {
  const run = await prepareBaseImportRun(input);

  if (!(run.status === 'queued' && (run.stats?.total ?? 0) > 0)) {
    return run;
  }

  const queueJobId = await enqueueBaseImportRunJob({
    runId: run.id,
    reason: 'start',
    statuses: ['pending'],
  });
  return updateBaseImportRunQueueJob(run.id, queueJobId);
};

export const startBaseImportRunResponse = async (
  input: StartBaseImportRunInput
): Promise<BaseImportStartResponse> => {
  const run = await startBaseImportRun(input);
  return toStartResponse(run) as BaseImportStartResponse;
};
