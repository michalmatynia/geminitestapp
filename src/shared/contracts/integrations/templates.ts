import { z } from 'zod';
import { namedDtoSchema } from '../base';
import { importTemplateParameterImportSchema } from '../data-import-export';

export const templateMappingSchema = z.object({
  sourceKey: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
});

export type TemplateMapping = z.infer<typeof templateMappingSchema>;

export const templateSchema = namedDtoSchema.extend({
  provider: z.string(),
  mappings: z.array(templateMappingSchema),
  config: z.record(z.string(), z.unknown()),
  description: z.string().nullable().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  parameterImport: importTemplateParameterImportSchema.optional(),
});

export type Template = z.infer<typeof templateSchema>;

export const createTemplateSchema = templateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTemplate = z.infer<typeof createTemplateSchema>;
export type UpdateTemplate = Partial<CreateTemplate>;
