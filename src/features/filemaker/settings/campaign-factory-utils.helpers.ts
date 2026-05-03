import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { normalizeString } from '../filemaker-settings.helpers';

export const sortRegistryEntriesNewestFirst = <
  T extends {
    updatedAt?: string | null | undefined;
    createdAt?: string | null | undefined;
  },
>(
  entries: T[]
): T[] =>
  [...entries].sort((left: T, right: T): number => {
    const leftTimestamp = Date.parse(left.updatedAt ?? left.createdAt ?? '');
    const rightTimestamp = Date.parse(right.updatedAt ?? right.createdAt ?? '');
    const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
    const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
    return normalizedRight - normalizedLeft;
  });

export const parseCampaignRegistryJson = (raw: string | null | undefined): unknown => {
  if (typeof raw !== 'string') return null;
  const trimmedRaw = raw.trim();
  if (trimmedRaw.length === 0) return null;

  try {
    return JSON.parse(trimmedRaw) as unknown;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const dedupeByNormalizedId = <T extends { id: string }>(entries: T[]): T[] => {
  const uniqueById = new Map<string, T>();
  entries.forEach((entry: T) => {
    const id = normalizeString(entry.id);
    uniqueById.set(id.length > 0 ? id : entry.id, entry);
  });
  return Array.from(uniqueById.values());
};
