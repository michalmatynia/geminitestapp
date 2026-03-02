import { z } from 'zod';
import { namedDtoSchema } from '../base';
import { importTemplateParameterImportSchema } from '../data-import-export';

export const integrationTemplateMappingSchema = z.object({
  sourceKey: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
});

export type IntegrationTemplateMapping = z.infer<typeof integrationTemplateMappingSchema>;
export type TemplateMapping = IntegrationTemplateMapping;

export const integrationTemplateSchema = namedDtoSchema.extend({
  provider: z.string(),
  mappings: z.array(integrationTemplateMappingSchema),
  config: z.record(z.string(), z.unknown()),
  description: z.string().nullable().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  parameterImport: importTemplateParameterImportSchema.optional(),
});

export type IntegrationTemplate = z.infer<typeof integrationTemplateSchema>;
export type Template = IntegrationTemplate;

export const createIntegrationTemplateSchema = integrationTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegrationTemplate = z.infer<typeof createIntegrationTemplateSchema>;
export type CreateTemplate = CreateIntegrationTemplate;
export type UpdateIntegrationTemplate = Partial<CreateIntegrationTemplate>;
export type UpdateTemplate = UpdateIntegrationTemplate;
