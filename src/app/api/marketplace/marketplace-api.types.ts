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
