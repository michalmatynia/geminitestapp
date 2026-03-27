import { z } from 'zod';

import { dtoBaseSchema } from '../base';

export const baseOrderImportStateSchema = z.enum(['new', 'imported', 'changed']);

export type BaseOrderImportState = z.infer<typeof baseOrderImportStateSchema>;

export const baseOrderImportStatusOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type BaseOrderImportStatusOption = z.infer<typeof baseOrderImportStatusOptionSchema>;

export const baseOrderImportLineItemSchema = z.object({
  sku: z.string().nullable(),
  name: z.string(),
  quantity: z.number(),
  unitPriceGross: z.number().nullable(),
  baseProductId: z.string().nullable(),
});

export type BaseOrderImportLineItem = z.infer<typeof baseOrderImportLineItemSchema>;

export const baseOrderImportPreviousSnapshotSchema = z.object({
  orderNumber: z.string().nullable(),
  externalStatusId: z.string().nullable(),
  externalStatusName: z.string().nullable(),
  buyerName: z.string(),
  buyerEmail: z.string().nullable(),
  currency: z.string().nullable(),
  totalGross: z.number().nullable(),
  deliveryMethod: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  source: z.string().nullable(),
  orderCreatedAt: z.string().nullable(),
  orderUpdatedAt: z.string().nullable(),
  lineItems: z.array(baseOrderImportLineItemSchema),
  lastImportedAt: z.string(),
});

export type BaseOrderImportPreviousSnapshot = z.infer<typeof baseOrderImportPreviousSnapshotSchema>;

export const baseOrderImportPreviewItemSchema = z.object({
  baseOrderId: z.string().min(1),
  orderNumber: z.string().nullable(),
  externalStatusId: z.string().nullable(),
  externalStatusName: z.string().nullable(),
  buyerName: z.string(),
  buyerEmail: z.string().nullable(),
  currency: z.string().nullable(),
  totalGross: z.number().nullable(),
  deliveryMethod: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  source: z.string().nullable(),
  orderCreatedAt: z.string().nullable(),
  orderUpdatedAt: z.string().nullable(),
  lineItems: z.array(baseOrderImportLineItemSchema),
  fingerprint: z.string(),
  raw: z.unknown(),
  importState: baseOrderImportStateSchema,
  lastImportedAt: z.string().nullable(),
  previousImport: baseOrderImportPreviousSnapshotSchema.nullable().optional(),
});

export type BaseOrderImportPreviewItem = z.infer<typeof baseOrderImportPreviewItemSchema>;

export const baseOrderImportStatusesResponseSchema = z.object({
  statuses: z.array(baseOrderImportStatusOptionSchema),
});

export type BaseOrderImportStatusesResponse = z.infer<typeof baseOrderImportStatusesResponseSchema>;

export const baseOrderImportStatusesPayloadSchema = z.object({
  connectionId: z.string().trim().min(1, 'Connection is required.'),
});

export type BaseOrderImportStatusesPayload = z.infer<typeof baseOrderImportStatusesPayloadSchema>;

export const baseOrderImportPreviewPayloadSchema = z.object({
  connectionId: z.string().trim().min(1, 'Connection is required.'),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
  statusId: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(250).default(50),
});

export type BaseOrderImportPreviewPayload = z.infer<typeof baseOrderImportPreviewPayloadSchema>;

export const baseOrderImportPreviewStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  newCount: z.number().int().nonnegative(),
  importedCount: z.number().int().nonnegative(),
  changedCount: z.number().int().nonnegative(),
});

export type BaseOrderImportPreviewStats = z.infer<typeof baseOrderImportPreviewStatsSchema>;

export const baseOrderImportPreviewResponseSchema = z.object({
  orders: z.array(baseOrderImportPreviewItemSchema),
  stats: baseOrderImportPreviewStatsSchema,
});

export type BaseOrderImportPreviewResponse = z.infer<typeof baseOrderImportPreviewResponseSchema>;

export const importedBaseOrderRecordSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  baseOrderId: z.string(),
  orderNumber: z.string().nullable(),
  externalStatusId: z.string().nullable(),
  externalStatusName: z.string().nullable(),
  buyerName: z.string(),
  buyerEmail: z.string().nullable(),
  currency: z.string().nullable(),
  totalGross: z.number().nullable(),
  deliveryMethod: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  source: z.string().nullable(),
  orderCreatedAt: z.string().nullable(),
  orderUpdatedAt: z.string().nullable(),
  lineItems: z.array(baseOrderImportLineItemSchema),
  fingerprint: z.string(),
  raw: z.unknown(),
  firstImportedAt: z.string(),
  lastImportedAt: z.string(),
});

export type ImportedBaseOrderRecord = z.infer<typeof importedBaseOrderRecordSchema>;

export const baseOrderImportPersistPayloadSchema = z.object({
  connectionId: z.string().trim().min(1, 'Connection is required.'),
  orders: z.array(baseOrderImportPreviewItemSchema).min(1, 'Select at least one order to import.'),
});

export type BaseOrderImportPersistPayload = z.infer<typeof baseOrderImportPersistPayloadSchema>;

export const baseOrderImportPersistResultSchema = z.object({
  baseOrderId: z.string(),
  result: z.enum(['created', 'updated']),
});

export type BaseOrderImportPersistResult = z.infer<typeof baseOrderImportPersistResultSchema>;

export const baseOrderImportPersistResponseSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  createdCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  syncedAt: z.string(),
  results: z.array(baseOrderImportPersistResultSchema),
});

export type BaseOrderImportPersistResponse = z.infer<typeof baseOrderImportPersistResponseSchema>;
