'use client';

export type SettingsStoreValue = {
  map: Map<string, string>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  get: (key: string) => string | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getNumber: (key: string, fallback?: number) => number | undefined;
  refetch: () => void;
};

export const emptySettingsMap = new Map<string, string>();

export const parseSettingsBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export const parseSettingsNumber = (
  value: string | undefined,
  fallback?: number
): number | undefined => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const fallbackSettingsStore: SettingsStoreValue = {
  map: emptySettingsMap,
  isLoading: false,
  isFetching: false,
  error: null,
  get: (key: string): string | undefined => emptySettingsMap.get(key),
  getBoolean: (_key: string, fallback: boolean = false): boolean => fallback,
  getNumber: (_key: string, fallback?: number): number | undefined => fallback,
  refetch: (): void => {
    // no-op
  },
};
