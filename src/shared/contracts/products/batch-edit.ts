import { z } from 'zod';

export const PRODUCT_BATCH_EDIT_LANGUAGES = ['en', 'pl', 'de', 'all'] as const;
export const PRODUCT_BATCH_EDIT_MODES = ['set', 'remove', 'prepend', 'append', 'replace'] as const;

export type ProductBatchEditLanguage = (typeof PRODUCT_BATCH_EDIT_LANGUAGES)[number];
export type ProductBatchEditMode = (typeof PRODUCT_BATCH_EDIT_MODES)[number];

export type ProductBatchEditFieldKind =
  | 'text'
  | 'localized-text'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'string-array'
  | 'json-array'
  | 'json-object';

export type ProductBatchEditFieldDefinition = {
  field: ProductBatchEditField;
  label: string;
  group: string;
  kind: ProductBatchEditFieldKind;
  description?: string;
};

export const PRODUCT_BATCH_EDIT_FIELD_VALUES = [
  'sku',
  'baseProductId',
  'importSource',
  'defaultPriceGroupId',
  'ean',
  'gtin',
  'asin',
  'name',
  'description',
  'supplierName',
  'supplierLink',
  'priceComment',
  'stock',
  'price',
  'sizeLength',
  'sizeWidth',
  'weight',
  'length',
  'archived',
  'categoryId',
  'shippingGroupId',
  'studioProjectId',
  'catalogIds',
  'tagIds',
  'producerIds',
  'noteIds',
  'imageLinks',
  'imageFileIds',
  'imageBase64s',
  'customFields',
  'parameters',
  'marketplaceContentOverrides',
  'notes',
] as const;

export type ProductBatchEditField = (typeof PRODUCT_BATCH_EDIT_FIELD_VALUES)[number];

export const PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS: ProductBatchEditFieldDefinition[] = [
  { field: 'sku', label: 'SKU', group: 'Identifiers', kind: 'text' },
  { field: 'baseProductId', label: 'Base Product ID', group: 'Identifiers', kind: 'text' },
  {
    field: 'importSource',
    label: 'Import Source',
    group: 'Identifiers',
    kind: 'enum',
    description: 'Currently supports Base.com import source values.',
  },
  {
    field: 'defaultPriceGroupId',
    label: 'Default Price Group ID',
    group: 'Identifiers',
    kind: 'text',
  },
  { field: 'ean', label: 'EAN', group: 'Identifiers', kind: 'text' },
  { field: 'gtin', label: 'GTIN', group: 'Identifiers', kind: 'text' },
  { field: 'asin', label: 'ASIN', group: 'Identifiers', kind: 'text' },
  { field: 'name', label: 'Name', group: 'Localized Content', kind: 'localized-text' },
  { field: 'description', label: 'Description', group: 'Localized Content', kind: 'localized-text' },
  { field: 'supplierName', label: 'Supplier Name', group: 'Commercial', kind: 'text' },
  { field: 'supplierLink', label: 'Supplier Link', group: 'Commercial', kind: 'text' },
  { field: 'priceComment', label: 'Price Comment', group: 'Commercial', kind: 'text' },
  { field: 'stock', label: 'Stock', group: 'Commercial', kind: 'number' },
  { field: 'price', label: 'Price', group: 'Commercial', kind: 'number' },
  { field: 'sizeLength', label: 'Size Length', group: 'Dimensions', kind: 'number' },
  { field: 'sizeWidth', label: 'Size Width', group: 'Dimensions', kind: 'number' },
  { field: 'weight', label: 'Weight', group: 'Dimensions', kind: 'number' },
  { field: 'length', label: 'Length', group: 'Dimensions', kind: 'number' },
  { field: 'archived', label: 'Archived', group: 'State', kind: 'boolean' },
  { field: 'categoryId', label: 'Category ID', group: 'Relations', kind: 'text' },
  { field: 'shippingGroupId', label: 'Shipping Group ID', group: 'Relations', kind: 'text' },
  { field: 'studioProjectId', label: 'Studio Project ID', group: 'Studio', kind: 'text' },
  { field: 'catalogIds', label: 'Catalog IDs', group: 'Relations', kind: 'string-array' },
  { field: 'tagIds', label: 'Tag IDs', group: 'Relations', kind: 'string-array' },
  { field: 'producerIds', label: 'Producer IDs', group: 'Relations', kind: 'string-array' },
  { field: 'noteIds', label: 'Note IDs', group: 'Relations', kind: 'string-array' },
  { field: 'imageLinks', label: 'Image Links', group: 'Images', kind: 'string-array' },
  { field: 'imageFileIds', label: 'Image File IDs', group: 'Images', kind: 'string-array' },
  { field: 'imageBase64s', label: 'Image Base64 Values', group: 'Images', kind: 'string-array' },
  { field: 'customFields', label: 'Custom Fields JSON', group: 'Advanced', kind: 'json-array' },
  { field: 'parameters', label: 'Parameters JSON', group: 'Advanced', kind: 'json-array' },
  {
    field: 'marketplaceContentOverrides',
    label: 'Marketplace Content Overrides JSON',
    group: 'Advanced',
    kind: 'json-array',
  },
  { field: 'notes', label: 'Notes JSON', group: 'Advanced', kind: 'json-object' },
];

export const productBatchEditFieldSchema = z.enum(PRODUCT_BATCH_EDIT_FIELD_VALUES);
export const productBatchEditLanguageSchema = z.enum(PRODUCT_BATCH_EDIT_LANGUAGES);
export const productBatchEditModeSchema = z.enum(PRODUCT_BATCH_EDIT_MODES);

export const productBatchEditOperationSchema = z
  .object({
    field: productBatchEditFieldSchema,
    language: productBatchEditLanguageSchema.optional(),
    mode: productBatchEditModeSchema,
    value: z.unknown().optional(),
    find: z.unknown().optional(),
    replaceWith: z.unknown().optional(),
  })
  .superRefine((operation, ctx) => {
    if (
      ['set', 'prepend', 'append'].includes(operation.mode) &&
      operation.value === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `${operation.mode} requires a value.`,
      });
    }
    if (operation.mode === 'replace') {
      if (operation.find === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['find'],
          message: 'replace requires a value to find.',
        });
      }
      if (operation.replaceWith === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['replaceWith'],
          message: 'replace requires a replacement value.',
        });
      }
    }
  });

export type ProductBatchEditOperation = z.infer<typeof productBatchEditOperationSchema>;

export const productBatchEditRequestSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(1000),
  operations: z.array(productBatchEditOperationSchema).min(1).max(25),
  dryRun: z.boolean().default(false),
});

export type ProductBatchEditRequest = z.infer<typeof productBatchEditRequestSchema>;

export const productBatchEditFieldChangeSchema = z.object({
  field: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
});

export type ProductBatchEditFieldChange = z.infer<typeof productBatchEditFieldChangeSchema>;

export const productBatchEditProductResultSchema = z.object({
  productId: z.string(),
  status: z.enum(['changed', 'unchanged', 'failed', 'not_found']),
  changes: z.array(productBatchEditFieldChangeSchema).default([]),
  error: z.string().optional(),
});

export type ProductBatchEditProductResult = z.infer<
  typeof productBatchEditProductResultSchema
>;

export const productBatchEditResponseSchema = z.object({
  status: z.literal('ok'),
  dryRun: z.boolean(),
  requested: z.number().int().min(0),
  matched: z.number().int().min(0),
  changed: z.number().int().min(0),
  unchanged: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(productBatchEditProductResultSchema),
});

export type ProductBatchEditResponse = z.infer<typeof productBatchEditResponseSchema>;

export const getProductBatchEditFieldDefinition = (
  field: ProductBatchEditField
): ProductBatchEditFieldDefinition => {
  const definition = PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS.find((entry) => entry.field === field);
  if (!definition) {
    throw new Error(`Unsupported product batch edit field: ${field}`);
  }
  return definition;
};
