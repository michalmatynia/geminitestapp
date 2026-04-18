const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeRecordArray = (value: unknown): Array<Record<string, unknown>> | null => {
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is Record<string, unknown> => isObjectRecord(entry));
};

const DIRECT_PRODUCT_SIGNAL_KEYS = [
  'asin',
  'title',
  'price',
  'url',
  'description',
  'heroImageUrl',
  'imageUrls',
  'amazonDetails',
  'amazonProbe',
  'supplierDetails',
] as const;

const OMIT_SINGLE_ITEM_KEYS = new Set([
  'status',
  'message',
  'stage',
  'steps',
  'scrapedItems',
  'candidatePreviews',
  'candidateResults',
  'candidateUrls',
]);

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const buildDirectProductItem = (payload: Record<string, unknown>): Record<string, unknown> | null => {
  const hasDirectProductSignal = DIRECT_PRODUCT_SIGNAL_KEYS.some((key) => hasValue(payload[key]));
  if (!hasDirectProductSignal) return null;

  const itemEntries = Object.entries(payload).filter(
    ([key, value]) => value !== undefined && !OMIT_SINGLE_ITEM_KEYS.has(key)
  );

  return itemEntries.length > 0 ? Object.fromEntries(itemEntries) : null;
};

const buildCandidateUrlItems = (value: unknown): Array<Record<string, unknown>> | null => {
  if (!Array.isArray(value)) return null;
  const urls = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
  return urls.length > 0 ? urls.map((url) => ({ url })) : null;
};

export const getProductScanScrapedItems = (
  payload: Record<string, unknown>
): Array<Record<string, unknown>> => {
  const explicitItems = normalizeRecordArray(payload['scrapedItems']);
  if (explicitItems !== null) return explicitItems;

  const status = normalizeString(payload['status']);
  const directProductItem = buildDirectProductItem(payload);
  if ((status === 'matched' || status === 'probe_ready') && directProductItem !== null) {
    return [directProductItem];
  }

  const candidatePreviews = normalizeRecordArray(payload['candidatePreviews']);
  if (candidatePreviews !== null && candidatePreviews.length > 0) return candidatePreviews;

  const candidateResults = normalizeRecordArray(payload['candidateResults']);
  if (candidateResults !== null && candidateResults.length > 0) return candidateResults;

  if (directProductItem !== null) return [directProductItem];

  const candidateUrlItems = buildCandidateUrlItems(payload['candidateUrls']);
  if (candidateUrlItems !== null) return candidateUrlItems;

  return [];
};
