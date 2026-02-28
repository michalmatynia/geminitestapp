import { z } from 'zod';
import { namedDtoSchema } from '../base';

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

export type ProductParameterSelectorTypeDto = z.infer<typeof productParameterSelectorTypeSchema>;

export const productParameterSchema = namedDtoSchema.extend({
  catalogId: z.string(),
  name_en: z.string(),
  name_pl: z.string().nullable(),
  name_de: z.string().nullable(),
  selectorType: productParameterSelectorTypeSchema,
  optionLabels: z.array(z.string()),
});

export type ProductParameterDto = z.infer<typeof productParameterSchema>;
export type ProductParameter = ProductParameterDto;

export const createProductParameterSchema = productParameterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductParameterDto = z.infer<typeof createProductParameterSchema>;
export type ProductParameterCreateInput = CreateProductParameterDto;
export type UpdateProductParameterDto = Partial<CreateProductParameterDto>;
export type ProductParameterUpdateInput = UpdateProductParameterDto;

/**
 * Simple Product Parameter (for flattened settings)
 */
export const productSimpleParameterSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: productParameterSelectorTypeSchema,
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
});

export type ProductSimpleParameterDto = z.infer<typeof productSimpleParameterSchema>;
export type ProductSimpleParameter = ProductSimpleParameterDto;
