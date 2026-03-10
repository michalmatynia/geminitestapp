import { z } from 'zod';

import { namedDtoSchema } from '../base';

export const importTemplateParameterImportSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['all', 'mapped']).optional(),
  languageScope: z.enum(['catalog_languages', 'default_only']).optional(),
  createMissingParameters: z.boolean().optional(),
  overwriteExistingValues: z.boolean().optional(),
  matchBy: z.enum(['base_id_then_name', 'name_only']).optional(),
});

export type ImportTemplateParameterImport = z.infer<typeof importTemplateParameterImportSchema>;

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
