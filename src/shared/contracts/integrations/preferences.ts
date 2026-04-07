import { z } from 'zod';

import { imageRetryPresetSchema } from './base';

export const baseActiveTemplatePreferencePayloadSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

export type BaseTemplatePreferencePayload = z.infer<typeof baseActiveTemplatePreferencePayloadSchema>;

export const basePreferenceScopeSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BasePreferenceScope = z.infer<typeof basePreferenceScopeSchema>;

export const baseScopedPreferenceQuerySchema = basePreferenceScopeSchema;

export type BaseScopedPreferenceQuery = z.infer<typeof baseScopedPreferenceQuerySchema>;

export const baseScopedTemplatePreferencePayloadSchema = baseActiveTemplatePreferencePayloadSchema.merge(
  basePreferenceScopeSchema
);

export type BaseActiveTemplatePreferencePayload = z.infer<
  typeof baseScopedTemplatePreferencePayloadSchema
>;

export const baseActiveTemplatePreferenceResponseSchema = z.object({
  templateId: z.string().nullable(),
});

export type BaseActiveTemplatePreferenceResponse = z.infer<
  typeof baseActiveTemplatePreferenceResponseSchema
>;

export const baseDefaultInventoryPreferencePayloadSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BaseDefaultInventoryPreferencePayload = z.infer<
  typeof baseDefaultInventoryPreferencePayloadSchema
>;

export const baseDefaultInventoryPreferenceResponseSchema = z.object({
  inventoryId: z.string().nullable(),
});

export type BaseDefaultInventoryPreferenceResponse = z.infer<
  typeof baseDefaultInventoryPreferenceResponseSchema
>;

export const baseExportWarehousePreferencePayloadSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1),
});

export type BaseExportWarehousePreferencePayload = z.infer<
  typeof baseExportWarehousePreferencePayloadSchema
>;

export const baseExportWarehousePreferenceQuerySchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export type BaseExportWarehousePreferenceQuery = z.infer<
  typeof baseExportWarehousePreferenceQuerySchema
>;

export const baseExportWarehousePreferenceResponseSchema = z.object({
  warehouseId: z.string().nullable(),
});

export type BaseExportWarehousePreferenceResponse = z.infer<
  typeof baseExportWarehousePreferenceResponseSchema
>;

export const baseDefaultConnectionPreferencePayloadSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
});

export type BaseDefaultConnectionPreferencePayload = z.infer<
  typeof baseDefaultConnectionPreferencePayloadSchema
>;

export const baseDefaultConnectionPreferenceResponseSchema = z.object({
  connectionId: z.string().nullable(),
});

export type BaseDefaultConnectionPreferenceResponse = z.infer<
  typeof baseDefaultConnectionPreferenceResponseSchema
>;

export const traderaDefaultConnectionPreferencePayloadSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
});

export type TraderaDefaultConnectionPreferencePayload = z.infer<
  typeof traderaDefaultConnectionPreferencePayloadSchema
>;

export const traderaDefaultConnectionPreferenceResponseSchema = z.object({
  connectionId: z.string().nullable(),
});

export type TraderaDefaultConnectionPreferenceResponse = z.infer<
  typeof traderaDefaultConnectionPreferenceResponseSchema
>;

export const vintedDefaultConnectionPreferencePayloadSchema = z.object({
  connectionId: z.string().trim().min(1).nullable().optional(),
});

export type VintedDefaultConnectionPreferencePayload = z.infer<
  typeof vintedDefaultConnectionPreferencePayloadSchema
>;

export const vintedDefaultConnectionPreferenceResponseSchema = z.object({
  connectionId: z.string().nullable(),
});

export type VintedDefaultConnectionPreferenceResponse = z.infer<
  typeof vintedDefaultConnectionPreferenceResponseSchema
>;

export const baseStockFallbackPreferencePayloadSchema = z.object({
  enabled: z.boolean(),
});

export type BaseStockFallbackPreferencePayload = z.infer<
  typeof baseStockFallbackPreferencePayloadSchema
>;

export const baseStockFallbackPreferenceResponseSchema = z.object({
  enabled: z.boolean(),
});

export type BaseStockFallbackPreferenceResponse = z.infer<
  typeof baseStockFallbackPreferenceResponseSchema
>;

export const baseImageRetryPresetsPayloadSchema = z.object({
  presets: z.array(imageRetryPresetSchema).min(1),
});

export type BaseImageRetryPresetsPayload = z.infer<typeof baseImageRetryPresetsPayloadSchema>;

export const baseImageRetryPresetsResponseSchema = z.object({
  presets: z.array(imageRetryPresetSchema),
});

export type BaseImageRetryPresetsResponse = z.infer<typeof baseImageRetryPresetsResponseSchema>;

export const baseSyncAllImagesResponseSchema = z.object({
  status: z.literal('ok'),
  jobId: z.string(),
});

export type BaseSyncAllImagesResponse = z.infer<typeof baseSyncAllImagesResponseSchema>;

export const baseSampleProductPayloadSchema = z.object({
  inventoryId: z.string().trim().optional().nullable(),
  productId: z.string().trim().min(1).optional(),
  connectionId: z.string().trim().min(1).optional(),
  saveOnly: z.boolean().optional(),
});

export type BaseSampleProductPayload = z.infer<typeof baseSampleProductPayloadSchema>;

export const baseSampleProductResponseSchema = z.object({
  productId: z.string().nullable().optional(),
  inventoryId: z.string().nullable().optional(),
});

export type BaseSampleProductResponse = z.infer<typeof baseSampleProductResponseSchema>;
