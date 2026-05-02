import { type AiPathRunRecord, type AiPathRunListOptions } from '@/shared/contracts/ai-paths';
import { type EnqueueRunInput, ACTIVE_RUN_STATUS_FILTER } from './types';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

export const findExistingPathRun = async (
  input: EnqueueRunInput,
  requestId: string | null
): Promise<AiPathRunRecord | null> => {
  if (requestId === null) return null;
  const repo = await getPathRunRepository();
  const options: AiPathRunListOptions = {
    pathId: input.pathId,
    statuses: [...ACTIVE_RUN_STATUS_FILTER],
    requestId,
    limit: 1,
    offset: 0,
  };
  
  if (input.userId !== undefined && input.userId !== null) {
      options.userId = input.userId;
  }

  const existingByRequestId = await repo.listRuns(options);
  return existingByRequestId.runs[0] ?? null;
};
