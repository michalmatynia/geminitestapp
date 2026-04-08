import { z } from 'zod';

export const traderaParameterMapperCatalogEntrySchema = z.object({
  id: z.string().trim().min(1),
  externalCategoryId: z.string().trim().min(1),
  externalCategoryName: z.string().trim().min(1),
  externalCategoryPath: z.string().trim().nullable().optional(),
  fieldLabel: z.string().trim().min(1),
  fieldKey: z.string().trim().min(1),
  optionLabels: z.array(z.string().trim().min(1)).default([]),
  source: z.literal('playwright').default('playwright'),
  fetchedAt: z.string().trim().min(1),
  runId: z.string().trim().nullable().optional(),
});

export type TraderaParameterMapperCatalogEntry = z.infer<
  typeof traderaParameterMapperCatalogEntrySchema
>;

export const traderaParameterMapperRuleSchema = z.object({
  id: z.string().trim().min(1),
  externalCategoryId: z.string().trim().min(1),
  externalCategoryName: z.string().trim().min(1),
  externalCategoryPath: z.string().trim().nullable().optional(),
  fieldLabel: z.string().trim().min(1),
  fieldKey: z.string().trim().min(1),
  parameterId: z.string().trim().min(1),
  parameterName: z.string().trim().min(1),
  parameterCatalogId: z.string().trim().min(1),
  sourceValue: z.string().trim().min(1),
  targetOptionLabel: z.string().trim().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type TraderaParameterMapperRule = z.infer<typeof traderaParameterMapperRuleSchema>;

export const traderaParameterMapperCatalogPayloadSchema = z.object({
  version: z.literal(1).default(1),
  entries: z.array(traderaParameterMapperCatalogEntrySchema).default([]),
});

export type TraderaParameterMapperCatalogPayload = z.infer<
  typeof traderaParameterMapperCatalogPayloadSchema
>;

export const traderaParameterMapperRulesPayloadSchema = z.object({
  version: z.literal(1).default(1),
  rules: z.array(traderaParameterMapperRuleSchema).default([]),
});

export type TraderaParameterMapperRulesPayload = z.infer<
  typeof traderaParameterMapperRulesPayloadSchema
>;

export const traderaParameterMapperCatalogFetchRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  externalCategoryId: z.string().trim().min(1),
});

export type TraderaParameterMapperCatalogFetchRequest = z.infer<
  typeof traderaParameterMapperCatalogFetchRequestSchema
>;

export const traderaParameterMapperCatalogFetchResponseSchema = z.object({
  connectionId: z.string().trim().min(1),
  externalCategoryId: z.string().trim().min(1),
  entries: z.array(traderaParameterMapperCatalogEntrySchema).default([]),
  message: z.string().trim().min(1),
});

export type TraderaParameterMapperCatalogFetchResponse = z.infer<
  typeof traderaParameterMapperCatalogFetchResponseSchema
>;

export const traderaResolvedParameterMapperSelectionSchema = z.object({
  fieldLabel: z.string().trim().min(1),
  fieldKey: z.string().trim().min(1),
  optionLabel: z.string().trim().min(1),
  parameterId: z.string().trim().min(1),
  parameterName: z.string().trim().min(1),
  sourceValue: z.string().trim().min(1),
});

export type TraderaResolvedParameterMapperSelection = z.infer<
  typeof traderaResolvedParameterMapperSelectionSchema
>;
