/**
 * Delays execution for a specified number of milliseconds.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) =>
    setTimeout(resolve, ms)
  );
