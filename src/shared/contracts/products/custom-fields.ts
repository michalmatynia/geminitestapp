import { z } from 'zod';

import { namedDtoSchema } from '../base';

export const productCustomFieldTypeSchema = z.enum(['text', 'checkbox_set']);

export type ProductCustomFieldType = z.infer<typeof productCustomFieldTypeSchema>;

export const productCustomFieldOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type ProductCustomFieldOption = z.infer<typeof productCustomFieldOptionSchema>;

export const productCustomFieldDefinitionSchema = namedDtoSchema.extend({
  type: productCustomFieldTypeSchema,
  options: z.array(productCustomFieldOptionSchema).default([]),
});

export type ProductCustomFieldDefinition = z.infer<typeof productCustomFieldDefinitionSchema>;

export const createProductCustomFieldDefinitionSchema = productCustomFieldDefinitionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProductCustomFieldDefinitionCreateInput = z.infer<
  typeof createProductCustomFieldDefinitionSchema
>;
export type ProductCustomFieldDefinitionUpdateInput = Partial<
  ProductCustomFieldDefinitionCreateInput
>;

export const productCustomFieldValueSchema = z.object({
  fieldId: z.string(),
  textValue: z.string().nullable().optional(),
  selectedOptionIds: z.array(z.string()).optional(),
});

export type ProductCustomFieldValue = z.infer<typeof productCustomFieldValueSchema>;
