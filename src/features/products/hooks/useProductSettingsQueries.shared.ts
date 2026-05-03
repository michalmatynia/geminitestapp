export const STABLE_SETTINGS_STALE_MS = 10 * 60 * 1_000;

export const STABLE_SETTINGS_QUERY_OPTIONS = {
  staleTime: STABLE_SETTINGS_STALE_MS,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
};

export const hasPersistedId = (id: string | undefined): id is string =>
  typeof id === 'string' && id.length > 0;

export const requireTrimmedString = (value: string | undefined, message: string): string => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    throw new Error(message);
  }
  return trimmed;
};
