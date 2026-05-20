import type { SemanticExtractedRecord, SemanticMappedRecord, SemanticProductRecord } from '../types';

// ── Fallback resolution helpers ───────────────────────────────────────────────

const firstNonEmpty = (...values: Array<string | null | undefined>): string | null => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
};

const resolveTitle = (mapped: SemanticMappedRecord): string | null =>
  firstNonEmpty(
    mapped.title,
    mapped.sku ? `SKU ${mapped.sku}` : null,
    mapped.externalId ? `Item ${mapped.externalId}` : null
  );

const resolveExternalId = (mapped: SemanticMappedRecord): string | null =>
  firstNonEmpty(mapped.sku, mapped.externalId, mapped.sourceUrl);

// ── Adapter ───────────────────────────────────────────────────────────────────

export const toSemanticProductRecord = (
  record: SemanticExtractedRecord
): SemanticProductRecord => {
  const { mapped } = record;
  return {
    title: resolveTitle(mapped),
    description: mapped.description,
    price: mapped.price,
    currency: mapped.currency,
    sku: mapped.sku,
    ean: mapped.ean,
    brand: mapped.brand,
    category: mapped.category,
    sourceUrl: mapped.sourceUrl,
    images: mapped.images,
    externalId: resolveExternalId(mapped),
    tags: mapped.tags,
    raw: mapped.raw,
  };
};

export const toSemanticProductRecords = (
  records: SemanticExtractedRecord[],
  options: { skipWithErrors?: boolean } = {}
): SemanticProductRecord[] => {
  const filtered = options.skipWithErrors
    ? records.filter((r) => !r.issues.some((i) => i.severity === 'error'))
    : records;
  return filtered.map(toSemanticProductRecord);
};
