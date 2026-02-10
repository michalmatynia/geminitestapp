import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const draftPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  gtin: z.string().optional().nullable(),
  asin: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_pl: z.string().optional().nullable(),
  description_de: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  sizeLength: z.number().optional().nullable(),
  sizeWidth: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  supplierLink: z.string().optional().nullable(),
  priceComment: z.string().optional().nullable(),
  stock: z.number().optional().nullable(),
  catalogIds: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  producerIds: z.array(z.string()).optional(),
  parameters: z
    .array(
      z.object({
        parameterId: z.string().min(1),
        value: z.string().optional().nullable(),
      })
    )
    .optional(),
  defaultPriceGroupId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  icon: z.string().optional().nullable(),
  iconColorMode: z.enum(['theme', 'custom']).optional().nullable(),
  iconColor: z.string().regex(HEX_COLOR_PATTERN).optional().nullable(),
  imageLinks: z.array(z.string()).optional(),
  baseProductId: z.string().optional().nullable(),
});

export const createDraftPayloadSchema = draftPayloadSchema;
export const updateDraftPayloadSchema = draftPayloadSchema.partial();

export const resolveDraftCategoryId = (input: {
  categoryId?: string | null | undefined;
}): string | null => {
  const explicitCategoryId =
    typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  return explicitCategoryId || null;
};
