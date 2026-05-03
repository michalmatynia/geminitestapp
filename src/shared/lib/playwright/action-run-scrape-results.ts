import { isObjectRecord } from '@/shared/utils/object-utils';

const readRecord = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!isObjectRecord(value)) return null;
  const nested = value[key];
  return isObjectRecord(nested) ? nested : null;
};

const toScrapedItems = (value: unknown): Array<Record<string, unknown>> | null => {
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is Record<string, unknown> => isObjectRecord(entry));
};

export const getPlaywrightActionRunResultRecord = (
  result: unknown
): Record<string, unknown> | null => {
  if (!isObjectRecord(result)) return null;
  const outputs = readRecord(result, 'outputs') ?? result;
  return readRecord(outputs, 'result') ?? outputs;
};

export const getPlaywrightActionRunScrapedItems = (
  result: unknown
): Array<Record<string, unknown>> => {
  const resultRecord = getPlaywrightActionRunResultRecord(result);
  const candidates: unknown[] = [
    resultRecord?.['scrapedItems'],
    resultRecord?.['rawProducts'],
    resultRecord?.['products'],
    isObjectRecord(result) ? result['scrapedItems'] : null,
    isObjectRecord(result) ? result['rawProducts'] : null,
    isObjectRecord(result) ? result['products'] : null,
    result,
  ];

  for (const candidate of candidates) {
    const items = toScrapedItems(candidate);
    if (items !== null) return items;
  }

  return [];
};
