import { z } from 'zod';

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(2_000).optional(),
  includeItems: z
    .enum(['true', 'false'])
    .optional()
    .transform((value: 'true' | 'false' | undefined): boolean | undefined => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
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
