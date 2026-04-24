import { type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { type getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { cleanupRunQueueEntries } from './cleanup';

const isTerminal = (status: string): boolean => 
  ['canceled', 'completed', 'failed'].includes(status);

const getDurationMs = (startedAt: string | null | undefined): number | null => {
    const startMs = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
    return Number.isFinite(startMs) ? Math.max(0, Date.now() - startMs) : null;
};

export const cancelPathRunWithRepository = async (
  repo: Awaited<ReturnType<typeof getPathRunRepository>>,
  runId: string
): Promise<AiPathRunRecord> => {
    const run = await repo.findRunById(runId);
    if (run === null) throw new Error(`Run ${runId} not found`);
    
    if (isTerminal(run.status)) {
      cleanupRunQueueEntries(runId);
      return run;
    }
    
    const finishedAt = new Date();
    const durationMs = getDurationMs(run.startedAt);
      
    const nextMeta = {
      ...(run.meta ?? {}),
      cancellation: {
        finishedAt: finishedAt.toISOString(),
      },
    };

    const updated = await repo.updateRunIfStatus(runId, [run.status], {
      status: 'canceled',
      finishedAt: finishedAt.toISOString(),
      meta: nextMeta,
    });
    
    const finalRun = updated ?? (await repo.findRunById(runId));
    if (finalRun === null) throw new Error(`Run ${runId} not found after cancellation`);
    
    await repo.createRunEvent({
        runId: finalRun.id,
        level: 'info',
        message: 'Run canceled.',
        metadata: {
            durationMs,
        },
    });
    
    cleanupRunQueueEntries(runId);
    return finalRun;
};
