import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export const shouldLogHomeTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';

export const createHomeTimingRecorder = () => {
  const timings: Record<string, number> = {};
  const totalStart = performance.now();

  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    timings[label] = performance.now() - start;
    return result;
  };

  const flush = async (): Promise<void> => {
    if (!shouldLogHomeTiming()) return;
    timings['total'] = performance.now() - totalStart;
    await logSystemEvent({
      level: 'info',
      message: '[timing] home',
      context: timings,
    });
  };

  return {
    withTiming,
    flush,
  };
};
