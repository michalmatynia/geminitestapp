import { z } from 'zod';

export const ecommerceProductExportStatusSchema = z.enum([
  'created',
  'updated',
  'unchanged',
]);

export type EcommerceProductExportStatus = z.infer<
  typeof ecommerceProductExportStatusSchema
>;

export const ecommerceProductExportItemSchema = z.object({
  productId: z.string(),
  status: ecommerceProductExportStatusSchema.or(z.literal('failed')),
  ecommerceProductId: z.string().nullable(),
  slug: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export type EcommerceProductExportItem = z.infer<
  typeof ecommerceProductExportItemSchema
>;

export const ecommerceProductExportResponseSchema = z.object({
  success: z.literal(true),
  productId: z.string(),
  status: ecommerceProductExportStatusSchema,
  ecommerceProductId: z.string(),
  slug: z.string(),
  exportedAt: z.string(),
});

export type EcommerceProductExportResponse = z.infer<
  typeof ecommerceProductExportResponseSchema
>;

export const ecommerceProductBulkExportRequestSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
});

export type EcommerceProductBulkExportRequest = z.infer<
  typeof ecommerceProductBulkExportRequestSchema
>;

export const ecommerceProductBulkExportResponseSchema = z.object({
  success: z.literal(true),
  requested: z.number().int().min(1),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  items: z.array(ecommerceProductExportItemSchema),
});

export type EcommerceProductBulkExportResponse = z.infer<
  typeof ecommerceProductBulkExportResponseSchema
>;

export type EcommerceProductDeleteResponse = {
  success: true;
  productId: string;
  ecommerceDeletedCount: number;
  listingDeletedCount: number;
};
