import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema } from './files';
import { asset3dSchema } from './viewer3d';

/**
 * Image Studio DTOs
 */

export const compositeLayerConfigSchema = z.object({
  slotId: z.string(),
  order: z.number(),
  opacity: z.number().optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional(),
});

export type CompositeLayerConfigDto = z.infer<typeof compositeLayerConfigSchema>;

export const slotGenerationMetadataSchema = z.object({
  role: z.enum(['generation', 'merge', 'base', 'import', 'composite']).optional(),
  sourceSlotId: z.string().optional(),
  relationType: z.string().optional(),
  generationFileId: z.string().optional(),
  generationRunId: z.string().optional(),
  generationOutputIndex: z.number().optional(),
  generationOutputCount: z.number().optional(),
  sourceSlotIds: z.array(z.string()).optional(),
  sourceReferenceIds: z.array(z.string()).optional(),
  outputFile: z.object({
    id: z.string(),
    filename: z.string(),
    filepath: z.string(),
    mimetype: z.string(),
    size: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    tags: z.array(z.string()),
  }).optional(),
  generationRequest: z.record(z.string(), z.unknown()).optional(),
  generationSettings: z.record(z.string(), z.unknown()).optional(),
  crop: z.record(z.string(), z.unknown()).optional(),
  center: z.record(z.string(), z.unknown()).optional(),
  upscale: z.record(z.string(), z.unknown()).optional(),
  generationCosts: z.object({
    currency: z.literal('USD'),
    estimated: z.literal(true),
    promptTokens: z.number(),
    promptCostUsdTotal: z.number(),
    promptCostUsdPerOutput: z.number(),
    imageCostUsdPerOutput: z.number(),
    totalCostUsdPerOutput: z.number(),
    outputCount: z.number(),
    actualCostUsd: z.number().optional(),
    tokenCostUsd: z.number().optional(),
  }).optional(),
  maskData: z.object({
    shapes: z.array(z.object({
      type: z.string(),
      points: z.array(z.object({ x: z.number(), y: z.number() })),
      closed: z.boolean(),
    })),
    invert: z.boolean(),
    feather: z.number(),
    attachedAt: z.string(),
  }).optional(),
  variant: z.string().optional(),
  inverted: z.boolean().optional(),
  generationMode: z.string().optional(),
  polygonCount: z.number().optional(),
  generationParams: z.object({
    prompt: z.string().optional(),
    model: z.string().optional(),
    timestamp: z.string().optional(),
    runId: z.string().optional(),
    outputIndex: z.number().optional(),
    outputCount: z.number().optional(),
  }).optional(),
  annotation: z.string().optional(),
  sequence: z.object({
    runId: z.string().optional(),
  }).optional(),
  compositeConfig: z.object({
    layers: z.array(compositeLayerConfigSchema),
    flattenedSlotId: z.string().optional(),
  }).optional(),
});

export type SlotGenerationMetadataDto = z.infer<typeof slotGenerationMetadataSchema>;

export const imageStudioSlotSchema = dtoBaseSchema.extend({
  projectId: z.string(),
  name: z.string().nullable(),
  folderPath: z.string().nullable(),
  position: z.number().nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageBase64: z.string().nullable().optional(),
  asset3dId: z.string().nullable().optional(),
  screenshotFileId: z.string().nullable().optional(),
  metadata: slotGenerationMetadataSchema.nullable().optional(),
  imageFile: imageFileSchema.nullable().optional(),
  screenshotFile: imageFileSchema.nullable().optional(),
  asset3d: asset3dSchema.nullable().optional(),
});

export type ImageStudioSlotDto = z.infer<typeof imageStudioSlotSchema>;

export const imageStudioProjectSchema = dtoBaseSchema.extend({
  canvasWidthPx: z.number().nullable(),
  canvasHeightPx: z.number().nullable(),
});

export type ImageStudioProjectDto = z.infer<typeof imageStudioProjectSchema>;

export const studioProjectsResponseSchema = z.object({
  projects: z.array(imageStudioProjectSchema),
});

export type StudioProjectsResponseDto = z.infer<typeof studioProjectsResponseSchema>;

export const studioSlotsResponseSchema = z.object({
  slots: z.array(imageStudioSlotSchema),
});

export type StudioSlotsResponseDto = z.infer<typeof studioSlotsResponseSchema>;
