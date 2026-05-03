import 'server-only';

import { dispatchBaseImportRunJob } from '@/features/integrations/workers/baseImportQueue';
import type { BaseImportRunRecord, BaseImportStartResponse } from '@/shared/contracts/integrations/base-com';

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

  const { dispatchMode, queueJobId } = await dispatchBaseImportRunJob({
    runId: run.id,
    reason: 'start',
    statuses: ['pending'],
  });
  return updateBaseImportRunQueueJob(run.id, queueJobId, dispatchMode);
};

export const startBaseImportRunResponse = async (
  input: StartBaseImportRunInput
): Promise<BaseImportStartResponse> => {
  const run = await startBaseImportRun(input);
  return toStartResponse(run);
};
