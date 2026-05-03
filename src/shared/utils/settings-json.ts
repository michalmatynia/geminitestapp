import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const parseJsonSetting = <T>(value: string | null | undefined, fallback: T): T => {
  if (value === null || value === undefined || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logClientCatch(error, {
      source: 'settings-json',
      action: 'parseJsonSetting',
      level: 'warn',
    });
    return fallback;
  }
};

export const serializeSetting = (value: unknown): string => JSON.stringify(value ?? null);
