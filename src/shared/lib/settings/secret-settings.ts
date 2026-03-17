import 'server-only';

import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const SECRET_CACHE_TTL_MS = 60_000;
const secretCache = new Map<string, { value: string | null; fetchedAt: number }>();

const normalizeSecretValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readSecretSettingValue = async (key: string): Promise<string | null> => {
  const now = Date.now();
  const cached = secretCache.get(key);
  if (cached && now - cached.fetchedAt < SECRET_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const value = normalizeSecretValue(await readStoredSettingValue(key));
    secretCache.set(key, { value, fetchedAt: now });
    return value;
  } catch (error) {
    void ErrorSystem.captureException(error);
    secretCache.set(key, { value: null, fetchedAt: now });
    return null;
  }
};

export const clearSecretSettingCache = (): void => {
  secretCache.clear();
};
