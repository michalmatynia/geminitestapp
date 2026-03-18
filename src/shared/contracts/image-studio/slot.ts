import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { imageFileSchema, type ImageFileRecord } from '../files';
import { asset3DRecordSchema } from '../viewer3d';
import {
  imageStudioCenterLayoutMetadataSchema,
  imageStudioCenterModeSchema,
  imageStudioCenterObjectBoundsSchema,
  imageStudioCropCanvasContextSchema,
  imageStudioCropModeSchema,
  imageStudioCropRectSchema,
  imageStudioObjectDetectionUsedSchema,
  imageStudioUpscaleModeSchema,
  imageStudioUpscaleSmoothingQualitySchema,
  imageStudioUpscaleStrategySchema,
  type ImageStudioCenterObjectBounds,
  type ImageStudioObjectDetectionUsed,
  type ImageStudioCenterLayoutMetadata,
} from '../image-studio-transform-contracts';
import {
  imageStudioOperationLifecycleSchema,
} from './base';
import {
  imageStudioDetectionDetailsSchema,
  type ImageStudioDetectionDetails,
} from '../image-studio-transform-contracts';

export type LandingSlotLike = {
  index: number;
  status: string;
  output?: ImageFileRecord | null;
};

// --- Composite ---

export const compositeLayerConfigSchema = z.object({
  slotId: z.string(),
  order: z.number(),
  opacity: z.number().optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional(),
});

export type CompositeLayerConfig = z.infer<typeof compositeLayerConfigSchema>;

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
  outputFile: z
    .object({
      id: z.string(),
      filename: z.string(),
      filepath: z.string(),
      mimetype: z.string(),
      size: z.number(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      tags: z.array(z.string()),
    })
    .optional(),
  generationRequest: z.record(z.string(), z.unknown()).optional(),
  generationSettings: z.record(z.string(), z.unknown()).optional(),
  crop: z.record(z.string(), z.unknown()).optional(),
  center: z.record(z.string(), z.unknown()).optional(),
  upscale: z.record(z.string(), z.unknown()).optional(),
  autoscale: z.record(z.string(), z.unknown()).optional(),
  generationCosts: z
    .object({
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
    })
    .optional(),
  maskData: z
    .object({
      shapes: z.array(
        z.object({
          type: z.string(),
          points: z.array(z.object({ x: z.number(), y: z.number() })),
          closed: z.boolean(),
        })
      ),
      invert: z.boolean(),
      feather: z.number(),
      attachedAt: z.string(),
    })
    .optional(),
  variant: z.string().optional(),
  inverted: z.boolean().optional(),
  generationMode: z.string().optional(),
  polygonCount: z.number().optional(),
  generationParams: z
    .object({
      prompt: z.string().optional(),
      model: z.string().optional(),
      timestamp: z.string().optional(),
      runId: z.string().optional(),
      outputIndex: z.number().optional(),
      outputCount: z.number().optional(),
    })
    .optional(),
  annotation: z.string().optional(),
  sequence: z
    .object({
      runId: z.string().optional(),
    })
    .optional(),
  compositeConfig: z
    .object({
      layers: z.array(compositeLayerConfigSchema),
      flattenedSlotId: z.string().optional(),
    })
    .optional(),
});

export type SlotGenerationMetadata = z.infer<typeof slotGenerationMetadataSchema>;

export const imageStudioSlotSchema = dtoBaseSchema.extend({
  projectId: z.string(),
  index: z.number().optional(),
  name: z.string().nullable(),
  folderPath: z.string().nullable(),
  position: z.number().nullable().optional(),
  filename: z.string().nullable().optional(),
  filepath: z.string().nullable().optional(),
  mimetype: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageBase64: z.string().nullable().optional(),
  asset3dId: z.string().nullable().optional(),
  screenshotFileId: z.string().nullable().optional(),
  metadata: slotGenerationMetadataSchema.nullable().optional(),
  imageFile: imageFileSchema.nullable().optional(),
  screenshotFile: imageFileSchema.nullable().optional(),
  asset3d: asset3DRecordSchema.nullable().optional(),
});

export type ImageStudioSlot = z.infer<typeof imageStudioSlotSchema>;
export type { ImageStudioSlot as ImageStudioSlotRecord, ImageStudioSlot as ImageStudioSlotDto };

export const createImageStudioSlotSchema = z.object({
  name: z.string().nullable().optional(),
  folderPath: z.string().nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageBase64: z.string().nullable().optional(),
  asset3dId: z.string().nullable().optional(),
  metadata: slotGenerationMetadataSchema.nullable().optional(),
});

export type CreateImageStudioSlotDto = z.infer<typeof createImageStudioSlotSchema>;

export const updateImageStudioSlotSchema = createImageStudioSlotSchema.partial();

export type UpdateImageStudioSlotDto = z.infer<typeof updateImageStudioSlotSchema>;

export const studioSlotsResponseSchema = z.object({
  slots: z.array(imageStudioSlotSchema),
});

export type StudioSlotsResponse = z.infer<typeof studioSlotsResponseSchema>;

export const imageStudioSlotResponseSchema = z.object({
  slot: imageStudioSlotSchema,
});

export type ImageStudioSlotResponse = z.infer<typeof imageStudioSlotResponseSchema>;

export const imageStudioEnsureSlotActionSchema = z.enum([
  'reused_existing',
  'reused_selected_slot',
  'created',
  'reused_deterministic',
]);

export type ImageStudioEnsureSlotAction = z.infer<typeof imageStudioEnsureSlotActionSchema>;

export const imageStudioEnsureSlotFromUploadResponseSchema = z.object({
  slot: imageStudioSlotSchema,
  created: z.boolean(),
  action: imageStudioEnsureSlotActionSchema,
});

export type ImageStudioEnsureSlotFromUploadResponse = z.infer<
  typeof imageStudioEnsureSlotFromUploadResponseSchema
>;

export const imageStudioSlotDeleteResponseSchema = z.object({
  ok: z.literal(true),
  deletedSlotIds: z.array(z.string()),
  timingsMs: z.unknown().optional(),
});

export type ImageStudioSlotDeleteResponse = z.infer<typeof imageStudioSlotDeleteResponseSchema>;

export const imageStudioSlotScreenshotResponseSchema = z.object({
  slot: imageStudioSlotSchema,
  screenshot: imageFileSchema,
});

export type ImageStudioSlotScreenshotResponse = z.infer<
  typeof imageStudioSlotScreenshotResponseSchema
>;

const imageStudioOutputImageSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    filepath: z.string(),
    mimetype: z.string(),
    size: z.number().finite().nonnegative(),
    width: z.number().finite().nullable().optional(),
    height: z.number().finite().nullable().optional(),
  })
  .passthrough();

export const imageStudioCropResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioCropModeSchema,
  effectiveMode: imageStudioCropModeSchema,
  slot: imageStudioSlotSchema,
  imageFile: imageStudioOutputImageSchema.optional(),
  cropRect: imageStudioCropRectSchema.nullable().optional(),
  canvasContext: imageStudioCropCanvasContextSchema.nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioCropResponse = z.infer<typeof imageStudioCropResponseSchema>;

export const imageStudioUpscaleResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioUpscaleModeSchema,
  effectiveMode: imageStudioUpscaleModeSchema,
  strategy: imageStudioUpscaleStrategySchema,
  scale: z.number().finite().nullable().optional(),
  targetWidth: z.number().int().positive().nullable().optional(),
  targetHeight: z.number().int().positive().nullable().optional(),
  smoothingQuality: imageStudioUpscaleSmoothingQualitySchema.nullable().optional(),
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioUpscaleResponse = z.infer<typeof imageStudioUpscaleResponseSchema>;

export const imageStudioCenterResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioCenterModeSchema,
  effectiveMode: imageStudioCenterModeSchema,
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  targetObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  layout: imageStudioCenterLayoutMetadataSchema.nullable().optional(),
  detectionUsed: imageStudioObjectDetectionUsedSchema.nullable().optional(),
  confidenceBefore: z.number().finite().min(0).max(1).nullable().optional(),
  detectionDetails: z.lazy(() => imageStudioDetectionDetailsSchema).nullable().optional(),
  scale: z.number().finite().nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioCenterResponse = z.infer<typeof imageStudioCenterResponseSchema>;

export type ImageStudioCenterMetadata = {
  effectiveMode?: string;
  sourceObjectBounds?: ImageStudioCenterObjectBounds | null;
  targetObjectBounds?: ImageStudioCenterObjectBounds | null;
  layout?: ImageStudioCenterLayoutMetadata | null;
  detectionUsed?: ImageStudioObjectDetectionUsed | null;
  confidenceBefore?: number | null;
  detectionDetails?: ImageStudioDetectionDetails | null;
  scale?: number | null;
};
