import { z } from 'zod';

import {
  optionalBooleanQuerySchema,
  optionalIntegerQuerySchema,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  page: optionalIntegerQuerySchema(z.number().int().min(1)),
  pageSize: optionalIntegerQuerySchema(z.number().int().min(1).max(2_000)),
  includeItems: optionalBooleanQuerySchema(),
});

export type ProductSyncRunDetailQuery = z.infer<typeof querySchema>;

export const buildProductSyncRunDetailOptions = (
  query: ProductSyncRunDetailQuery | undefined
): {
  page?: number;
  pageSize?: number;
  includeItems?: boolean;
} => ({
  ...(query?.page !== undefined ? { page: query.page } : {}),
  ...(query?.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
  ...(query?.includeItems !== undefined ? { includeItems: query.includeItems } : {}),
});
