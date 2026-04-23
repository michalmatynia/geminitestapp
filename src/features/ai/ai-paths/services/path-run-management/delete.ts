import { type AiPathRunListOptions } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { cleanupRunQueueEntries, cleanupRunQueueEntriesBatch } from './cleanup';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const deletePathRun = async (runId: string): Promise<boolean> => {
  try {
    const repo = await getPathRunRepository();
    cleanupRunQueueEntries(runId);
    return await repo.deleteRun(runId);
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to delete path run', {
      service: 'ai-paths-service',
      action: 'deletePathRun',
      runId,
      error,
    });
    throw error;
  }
};

export const deletePathRuns = async (
  options: AiPathRunListOptions = {}
): Promise<{ count: number }> => {
  try {
    const repo = await getPathRunRepository();
    const { runs } = await repo.listRuns(options);
    const runIds = runs
      .map((run) => run.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    
    cleanupRunQueueEntriesBatch(runIds);
    return await repo.deleteRuns(options);
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to delete path runs in batch', {
      service: 'ai-paths-service',
      action: 'deletePathRuns',
      options,
      error,
    });
    throw error;
  }
};
