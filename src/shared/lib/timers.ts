export const startIntervalTask = (
  task: () => void | Promise<void>,
  intervalMs: number
): ReturnType<typeof setInterval> =>
  setInterval(() => {
    void task();
  }, intervalMs);
