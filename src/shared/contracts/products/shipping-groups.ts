import { z } from 'zod';

import { namedDtoSchema } from '../base';

const normalizeCategoryIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    unique.add(trimmed);
  }

  return Array.from(unique);
};

const normalizeCurrencyCodeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toUpperCase();
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};

const shippingGroupCategoryIdsSchema = z.preprocess(
  normalizeCategoryIdList,
  z.array(z.string().min(1)).default([])
);

const shippingGroupCurrencyCodesSchema = z.preprocess(
  normalizeCurrencyCodeList,
  z.array(z.string().min(1)).default([])
);

export const productShippingGroupSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  catalogId: z.string(),
  traderaShippingCondition: z.string().nullable().optional(),
  traderaShippingPriceEur: z.number().finite().nonnegative().nullable().optional(),
  autoAssignCategoryIds: shippingGroupCategoryIdsSchema,
  autoAssignCurrencyCodes: shippingGroupCurrencyCodesSchema,
});

export type ProductShippingGroup = z.infer<typeof productShippingGroupSchema>;

export const createProductShippingGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
  traderaShippingCondition: z.string().nullable().optional(),
  traderaShippingPriceEur: z.number().finite().nonnegative().nullable().optional(),
  autoAssignCategoryIds: shippingGroupCategoryIdsSchema.optional(),
  autoAssignCurrencyCodes: shippingGroupCurrencyCodesSchema.optional(),
});

export type ProductShippingGroupCreateInput = z.infer<typeof createProductShippingGroupSchema>;

export const updateProductShippingGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
  traderaShippingCondition: z.string().nullable().optional(),
  traderaShippingPriceEur: z.number().finite().nonnegative().nullable().optional(),
  autoAssignCategoryIds: shippingGroupCategoryIdsSchema.optional(),
  autoAssignCurrencyCodes: shippingGroupCurrencyCodesSchema.optional(),
});

export type ProductShippingGroupUpdateInput = z.infer<typeof updateProductShippingGroupSchema>;

export const productShippingGroupFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
  skip: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ProductShippingGroupFilters = z.infer<typeof productShippingGroupFiltersSchema>;
