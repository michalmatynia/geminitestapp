export const resolveProductScrapeAbortError = (signal: AbortSignal): Error => {
  const reason = signal.reason as unknown;
  if (reason instanceof Error) return reason;
  if (typeof reason === 'string' && reason.trim().length > 0) return new Error(reason);
  return new Error('Scrape profile run aborted.');
};

export const throwIfProductScrapeAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted === true) throw resolveProductScrapeAbortError(signal);
};
