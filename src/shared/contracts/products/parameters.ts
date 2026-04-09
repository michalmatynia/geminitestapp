import { z } from 'zod';

import { namedDtoSchema } from '../base';
import { productTitleTermTypeSchema } from './title-terms';

/**
 * Product Parameter Contract
 */
export const productParameterSelectorTypeSchema = z.enum([
  'text',
  'textarea',
  'radio',
  'select',
  'dropdown',
  'checkbox',
  'checklist',
]);

export type ProductParameterSelectorType = z.infer<typeof productParameterSelectorTypeSchema>;

export const PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES = ['text', 'textarea'] as const satisfies readonly ProductParameterSelectorType[];

export const productParameterLinkedTitleTermTypeSchema = productTitleTermTypeSchema
  .nullable()
  .default(null);

export type ProductParameterLinkedTitleTermType = z.infer<
  typeof productParameterLinkedTitleTermTypeSchema
>;

export const productParameterSchema = namedDtoSchema.extend({
  catalogId: z.string(),
  name_en: z.string(),
  name_pl: z.string().nullable(),
  name_de: z.string().nullable(),
  selectorType: productParameterSelectorTypeSchema,
  optionLabels: z.array(z.string()),
  linkedTitleTermType: productParameterLinkedTitleTermTypeSchema,
});

export type ProductParameter = z.infer<typeof productParameterSchema>;

export const createProductParameterSchema = productParameterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProductParameterCreateInput = z.infer<typeof createProductParameterSchema>;
export type ProductParameterUpdateInput = Partial<ProductParameterCreateInput>;

/**
 * Simple Product Parameter (for flattened settings)
 */
export const productSimpleParameterSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  type: productParameterSelectorTypeSchema.optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  catalogId: z.string().optional(),
  name: z.string().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  linkedTitleTermType: productParameterLinkedTitleTermTypeSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductSimpleParameter = z.infer<typeof productSimpleParameterSchema>;

export const productSimpleParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string(),
});

export type ProductSimpleParameterValue = z.infer<typeof productSimpleParameterValueSchema>;
