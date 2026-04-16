import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export const shouldLogHomeTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';

type HomeTimingRecorder = {
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  flush: () => Promise<void>;
};

export const createHomeTimingRecorder = (): HomeTimingRecorder => {
  const enabled = shouldLogHomeTiming();

  if (!enabled) {
    return {
      withTiming: <T>(_label: string, fn: () => Promise<T>): Promise<T> => fn(),
      flush: (): Promise<void> => Promise.resolve(),
    };
  }

  const timings: Record<string, number> = {};
  const totalStart = performance.now();

  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    timings[label] = performance.now() - start;
    return result;
  };

  const flush = async (): Promise<void> => {
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
