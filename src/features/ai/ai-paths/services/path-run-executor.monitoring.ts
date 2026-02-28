import type { AiPathRunRepository as PathRunRepository } from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type CancellationMonitorState = {
  active: boolean;
  timer: NodeJS.Timeout | null;
};

export const createCancellationMonitor = (params: {
  runId: string;
  repo: PathRunRepository;
  abortController: AbortController;
  pollIntervalMs: number;
  onMissingRun: () => void;
}) => {
  const state: CancellationMonitorState = {
    active: false,
    timer: null,
  };

  const stop = (): void => {
    state.active = false;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  };

  const check = async (): Promise<boolean> => {
    if (params.abortController.signal.aborted) return true;
    try {
      const latestRun = await params.repo.findRunById(params.runId);
      if (!latestRun) {
        params.onMissingRun();
        return false;
      }
      if (latestRun.status !== 'canceled') return false;
      params.abortController.abort();
      return true;
    } catch (error) {
      void ErrorSystem.logWarning('Failed to check cancellation status', {
        service: 'ai-paths-executor',
        error,
        runId: params.runId,
      });
      return false;
    }
  };

  const start = async (): Promise<boolean> => {
    const cancelledBeforeStart = await check();
    if (cancelledBeforeStart) return true;
    state.active = true;
    const scheduleNext = (): void => {
      if (!state.active) return;
      state.timer = setTimeout(() => {
        void (async () => {
          if (!state.active) return;
          const cancelled = await check();
          if (!cancelled) {
            scheduleNext();
          }
        })();
      }, params.pollIntervalMs);
    };
    scheduleNext();
    return false;
  };

  return { start, stop, check };
};
