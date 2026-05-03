import { isObjectRecord } from '@/shared/utils/object-utils';

export const parseProgrammableTestResultJson = (value: string): unknown | null => {
  if (value.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export const getProgrammableTestResultRecord = (
  parsed: unknown
): Record<string, unknown> | null => {
  if (!isObjectRecord(parsed)) {
    return null;
  }

  const result = parsed['result'];
  return isObjectRecord(result) ? result : null;
};

export const getProgrammableScrapedItemsFromResultRecord = (
  result: Record<string, unknown> | null
): unknown[] => {
  if (!result) {
    return [];
  }

  const scrapedItems = result['scrapedItems'];
  if (Array.isArray(scrapedItems)) {
    return scrapedItems;
  }

  const rawProducts = result['rawProducts'];
  return Array.isArray(rawProducts) ? rawProducts : [];
};

export const getProgrammableScrapedItemsFromTestResultJson = (value: string): unknown[] =>
  getProgrammableScrapedItemsFromResultRecord(
    getProgrammableTestResultRecord(parseProgrammableTestResultJson(value))
  );
