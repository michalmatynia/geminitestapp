import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Data Import/Export DTOs
 */

export const importJobSchema = dtoBaseSchema.extend({
  type: z.string(),
  status: z.string(), // Generic status
  progress: z.number(),
  totalRecords: z.number(),
  processedRecords: z.number(),
  errorRecords: z.number(),
  config: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ImportJobDto = z.infer<typeof importJobSchema>;

export const exportJobSchema = dtoBaseSchema.extend({
  type: z.string(),
  status: z.string(), // Generic status
  progress: z.number(),
  totalRecords: z.number(),
  processedRecords: z.number(),
  config: z.record(z.string(), z.unknown()),
  fileUrl: z.string().nullable(),
  error: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ExportJobDto = z.infer<typeof exportJobSchema>;

export const importTemplateSchema = namedDtoSchema.extend({
  type: z.string(),
  config: z.record(z.string(), z.unknown()),
  fieldMappings: z.record(z.string(), z.string()),
});

export type ImportTemplateDto = z.infer<typeof importTemplateSchema>;

export const importExportTemplateMappingSchema = z.object({
  sourceKey: z.string(),
  targetField: z.string(),
});

export type ImportExportTemplateMappingDto = z.infer<typeof importExportTemplateMappingSchema>;

export const importExportTemplateSchema = namedDtoSchema.extend({
  mappings: z.array(importExportTemplateMappingSchema),
  exportImagesAsBase64: z.boolean().optional(),
});

export type ImportExportTemplateDto = z.infer<typeof importExportTemplateSchema>;

export const createImportExportTemplateSchema = importExportTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportExportTemplateDto = z.infer<typeof createImportExportTemplateSchema>;
export type ImportExportTemplateCreateInput = CreateImportExportTemplateDto;
export type UpdateImportExportTemplateDto = Partial<CreateImportExportTemplateDto>;
export type ImportExportTemplateUpdateInput = UpdateImportExportTemplateDto;

export const createImportTemplateSchema = importTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportTemplateDto = z.infer<typeof createImportTemplateSchema>;
export type ImportTemplateCreateInput = CreateImportTemplateDto;
export type UpdateImportTemplateDto = Partial<CreateImportTemplateDto>;
export type ImportTemplateUpdateInput = UpdateImportTemplateDto;

export const createImportJobBaseSchema = importJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportJobDto_Base = z.infer<typeof createImportJobBaseSchema>;

export type UpdateImportJobDto = Partial<CreateImportJobDto_Base>;

export const createExportJobBaseSchema = exportJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateExportJobDto_Base = z.infer<typeof createExportJobBaseSchema>;

export type UpdateExportJobDto = Partial<CreateExportJobDto_Base>;

// Browser-native File object
export const createImportJobSchema = z.object({
  type: z.string(),
  file: z.any(),
  config: z.record(z.string(), z.unknown()).optional(),
  templateId: z.string().optional(),
});

export type CreateImportJobDto = {
  type: string;
  file: File;
  config?: Record<string, unknown>;
  templateId?: string;
};

export const createExportJobSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.unknown()),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type CreateExportJobDto = z.infer<typeof createExportJobSchema>;
