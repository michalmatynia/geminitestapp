import { z } from 'zod';
import { dtoBaseSchema, namedDtoSchema } from '../base';

/**
 * Image Processing Contracts
 */
export const imageTransformOptionsSchema = z.object({
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  quality: z.number().optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  forceJpeg: z.boolean().optional(),
  maxDimension: z.number().optional(),
  jpegQuality: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type ImageTransformOptions = z.infer<typeof imageTransformOptionsSchema>;

export const imageBase64ModeSchema = z.enum(['base-only', 'full-data-uri']);
export type ImageBase64Mode = z.infer<typeof imageBase64ModeSchema>;

export const imageRetryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().optional(),
  description: z.string(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']),
  transform: imageTransformOptionsSchema,
});

export type ImageRetryPreset = z.infer<typeof imageRetryPresetSchema>;

/**
 * Integration DTOs
 */

export const integrationSchema = namedDtoSchema.extend({
  slug: z.string(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationDto = Integration;

export const createIntegrationSchema = integrationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegration = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegration = Partial<CreateIntegration>;
