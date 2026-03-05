export type IntervalTaskHandle = {
  cancel: () => void;
};

export const startIntervalTask = (
  task: () => void | Promise<void>,
  intervalMs: number
): IntervalTaskHandle => {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const run = (): void => {
    void Promise.resolve(task()).finally(() => {
      if (cancelled) {
        return;
      }
      timeoutId = setTimeout(run, intervalMs);
    });
  };

  timeoutId = setTimeout(run, intervalMs);

  return {
    cancel: () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
};
