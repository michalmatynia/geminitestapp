import { z } from 'zod';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

/**
 * Common query schema for marketplace resources that require a connectionId.
 */
export const marketplaceConnectionQuerySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

/**
 * Result shape for marketplace mapping save operations.
 */
export type MarketplaceMappingSaveResult<T> = {
  body: T;
  status: 200 | 201;
};

/**
 * Generic repository interface for marketplace mapping save operations.
 */
export type MarketplaceMappingSaveRepository<TRecord, TCreateFields, TUpdateFields> = {
  create: (input: TCreateFields) => Promise<TRecord>;
  update: (id: string, input: TUpdateFields) => Promise<TRecord>;
};

/**
 * Generic helper to save a marketplace mapping (create if missing, update if exists).
 */
export const saveMarketplaceMapping = async <
  TRecord extends { id: string },
  TCreateFields,
  TUpdateFields,
>(
  repo: MarketplaceMappingSaveRepository<TRecord, TCreateFields, TUpdateFields>,
  findExisting: () => Promise<TRecord | null>,
  input: TCreateFields,
  updateFields: TUpdateFields
): Promise<MarketplaceMappingSaveResult<TRecord>> => {
  const existing = await findExisting();
  if (existing) {
    const updated = await repo.update(existing.id, updateFields);
    return { body: updated, status: 200 };
  }

  const created = await repo.create(input);
  return { body: created, status: 201 };
};
