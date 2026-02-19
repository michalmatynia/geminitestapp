import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema } from './files';
import { asset3dSchema } from './viewer3d';

/**
 * Image Studio DTOs
 */

// --- Crop ---

export const IMAGE_STUDIO_CROP_MAX_SOURCE_SIDE_PX = 16_384;
export const IMAGE_STUDIO_CROP_MAX_SOURCE_PIXELS = 120_000_000;
export const IMAGE_STUDIO_CROP_MAX_OUTPUT_PIXELS = 80_000_000;

export const IMAGE_STUDIO_CROP_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_CROP_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_CROP_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_CROP_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_CROP_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_CROP_SOURCE_DIMENSIONS_INVALID',
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_CROP_SOURCE_IMAGE_TOO_LARGE',
  CROP_RECT_INVALID: 'IMAGE_STUDIO_CROP_RECT_INVALID',
  CROP_POLYGON_INVALID: 'IMAGE_STUDIO_CROP_POLYGON_INVALID',
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_CROP_CLIENT_IMAGE_REQUIRED',
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_CROP_CLIENT_DATA_URL_INVALID',
  OUTPUT_INVALID: 'IMAGE_STUDIO_CROP_OUTPUT_INVALID',
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_CROP_OUTPUT_PERSIST_FAILED',
} as const;

export type ImageStudioCropErrorCode =
  (typeof IMAGE_STUDIO_CROP_ERROR_CODES)[keyof typeof IMAGE_STUDIO_CROP_ERROR_CODES];

export const imageStudioCropModeSchema = z.enum(['client_bbox', 'server_bbox', 'server_polygon']);

export type ImageStudioCropModeDto = z.infer<typeof imageStudioCropModeSchema>;
export type ImageStudioCropMode = ImageStudioCropModeDto;

export const imageStudioCropPointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});
export type ImageStudioCropPointDto = z.infer<typeof imageStudioCropPointSchema>;
export type ImageStudioCropPoint = ImageStudioCropPointDto;

export const imageStudioCropRectSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type ImageStudioCropRectDto = z.infer<typeof imageStudioCropRectSchema>;
export type ImageStudioCropRect = ImageStudioCropRectDto;

export const imageStudioCropDiagnosticsSchema = z.object({
  rawCanvasBounds: imageStudioCropRectSchema.nullable().optional(),
  mappedImageBounds: imageStudioCropRectSchema.nullable().optional(),
  imageContentFrame: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  }).nullable().optional(),
  usedImageContentFrameMapping: z.boolean().optional(),
});
export type ImageStudioCropDiagnosticsDto = z.infer<typeof imageStudioCropDiagnosticsSchema>;
export type ImageStudioCropDiagnostics = ImageStudioCropDiagnosticsDto;

export const imageStudioCropRequestSchema = z
  .object({
    mode: imageStudioCropModeSchema,
    cropRect: imageStudioCropRectSchema.optional(),
    polygon: z.array(imageStudioCropPointSchema).min(3).optional(),
    dataUrl: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(180).optional(),
    requestId: z.string().trim().min(8).max(160).optional(),
    diagnostics: imageStudioCropDiagnosticsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.mode === 'client_bbox' || value.mode === 'server_bbox') && !value.cropRect) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cropRect'],
        message: 'Bounding box crop requires cropRect.',
      });
    }
    if (value.mode === 'server_polygon' && (!value.polygon || value.polygon.length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['polygon'],
        message: 'Polygon crop requires at least 3 points.',
      });
    }
  });

export type ImageStudioCropRequestDto = z.infer<typeof imageStudioCropRequestSchema>;
export type ImageStudioCropRequest = ImageStudioCropRequestDto;

// --- Upscale ---

export const IMAGE_STUDIO_UPSCALE_MIN_SCALE = 1;
export const IMAGE_STUDIO_UPSCALE_MAX_SCALE = 8;
export const IMAGE_STUDIO_UPSCALE_MAX_SOURCE_SIDE_PX = 16_384;
export const IMAGE_STUDIO_UPSCALE_MAX_SOURCE_PIXELS = 120_000_000;
export const IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX = 32_768;
export const IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_PIXELS = 220_000_000;

export const IMAGE_STUDIO_UPSCALE_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_UPSCALE_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_UPSCALE_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_UPSCALE_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_UPSCALE_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_UPSCALE_SOURCE_DIMENSIONS_INVALID',
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_UPSCALE_SOURCE_IMAGE_TOO_LARGE',
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_UPSCALE_CLIENT_IMAGE_REQUIRED',
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_UPSCALE_CLIENT_DATA_URL_INVALID',
  SCALE_INVALID: 'IMAGE_STUDIO_UPSCALE_SCALE_INVALID',
  TARGET_RESOLUTION_INVALID: 'IMAGE_STUDIO_UPSCALE_TARGET_RESOLUTION_INVALID',
  OUTPUT_INVALID: 'IMAGE_STUDIO_UPSCALE_OUTPUT_INVALID',
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_UPSCALE_OUTPUT_PERSIST_FAILED',
} as const;

export type ImageStudioUpscaleErrorCode =
  (typeof IMAGE_STUDIO_UPSCALE_ERROR_CODES)[keyof typeof IMAGE_STUDIO_UPSCALE_ERROR_CODES];

export const imageStudioUpscaleModeSchema = z.enum(['client_data_url', 'server_sharp']);
export type ImageStudioUpscaleModeDto = z.infer<typeof imageStudioUpscaleModeSchema>;
export type ImageStudioUpscaleMode = ImageStudioUpscaleModeDto;

export const imageStudioUpscaleStrategySchema = z.enum(['scale', 'target_resolution']);
export type ImageStudioUpscaleStrategyDto = z.infer<typeof imageStudioUpscaleStrategySchema>;
export type ImageStudioUpscaleStrategy = ImageStudioUpscaleStrategyDto;

export const imageStudioUpscaleSmoothingQualitySchema = z.enum(['low', 'medium', 'high']);
export type ImageStudioUpscaleSmoothingQualityDto = z.infer<typeof imageStudioUpscaleSmoothingQualitySchema>;
export type ImageStudioUpscaleSmoothingQuality = ImageStudioUpscaleSmoothingQualityDto;


export const imageStudioUpscaleRequestSchema = z.object({
  mode: imageStudioUpscaleModeSchema.default('server_sharp'),
  strategy: imageStudioUpscaleStrategySchema.optional(),
  scale: z.number().finite().gt(1).max(8).optional(),
  targetWidth: z.number().int().positive().optional(),
  targetHeight: z.number().int().positive().optional(),
  smoothingQuality: imageStudioUpscaleSmoothingQualitySchema.optional(),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
}).superRefine((value, ctx) => {
  const inferredStrategy =
    value.strategy ??
    ((typeof value.targetWidth === 'number' || typeof value.targetHeight === 'number')
      ? 'target_resolution'
      : 'scale');

  if (inferredStrategy === 'target_resolution') {
    if (typeof value.targetWidth !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetWidth'],
        message: 'targetWidth is required when strategy is target_resolution.',
      });
    }
    if (typeof value.targetHeight !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetHeight'],
        message: 'targetHeight is required when strategy is target_resolution.',
      });
    }
  }
});

export type ImageStudioUpscaleRequestDto = z.infer<typeof imageStudioUpscaleRequestSchema>;
export type ImageStudioUpscaleRequest = ImageStudioUpscaleRequestDto;

// --- Center ---

export const IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX = 16_384;
export const IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS = 120_000_000;
export const IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS = 120_000_000;
export const IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD = 8;
export const IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT = 8;
export const IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT = 0;
export const IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT = 40;
export const IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD = 16;
export const IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD = 1;
export const IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD = 80;
export const IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD = 10;
export const IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD = 0;
export const IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD = 80;

export const IMAGE_STUDIO_CENTER_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_CENTER_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_CENTER_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_CENTER_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_CENTER_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_CENTER_SOURCE_DIMENSIONS_INVALID',
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_CENTER_SOURCE_IMAGE_TOO_LARGE',
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_CENTER_SOURCE_OBJECT_NOT_FOUND',
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_CENTER_CLIENT_IMAGE_REQUIRED',
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_CENTER_CLIENT_DATA_URL_INVALID',
  LAYOUT_CONFIG_INVALID: 'IMAGE_STUDIO_CENTER_LAYOUT_CONFIG_INVALID',
  OUTPUT_INVALID: 'IMAGE_STUDIO_CENTER_OUTPUT_INVALID',
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_CENTER_OUTPUT_PERSIST_FAILED',
} as const;

export type ImageStudioCenterErrorCode =
  (typeof IMAGE_STUDIO_CENTER_ERROR_CODES)[keyof typeof IMAGE_STUDIO_CENTER_ERROR_CODES];

export const imageStudioCenterModeSchema = z.enum([
  'client_alpha_bbox',
  'server_alpha_bbox',
  'client_object_layout_v1',
  'server_object_layout_v1',
]);

export type ImageStudioCenterModeDto = z.infer<typeof imageStudioCenterModeSchema>;

export const imageStudioCenterDetectionModeSchema = z.enum([
  'auto',
  'alpha_bbox',
  'white_bg_first_colored_pixel',
]);
export type ImageStudioCenterDetectionModeDto = z.infer<typeof imageStudioCenterDetectionModeSchema>;

export const imageStudioCenterObjectBoundsSchema = z.object({
  left: z.number().int().min(0),
  top: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ImageStudioCenterObjectBoundsDto = z.infer<typeof imageStudioCenterObjectBoundsSchema>;

export const imageStudioCenterLayoutConfigSchema = z.object({
  paddingPercent: z
    .number()
    .finite()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT)
    .optional(),
  paddingXPercent: z
    .number()
    .finite()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT)
    .optional(),
  paddingYPercent: z
    .number()
    .finite()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT)
    .optional(),
  whiteThreshold: z
    .number()
    .int()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD)
    .optional(),
  chromaThreshold: z
    .number()
    .int()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD)
    .optional(),
  detection: imageStudioCenterDetectionModeSchema.optional(),
});
export type ImageStudioCenterLayoutConfigDto = z.infer<typeof imageStudioCenterLayoutConfigSchema>;

export const imageStudioCenterRequestSchema = z.object({
  mode: imageStudioCenterModeSchema,
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioCenterRequestDto = z.infer<typeof imageStudioCenterRequestSchema>;
export type ImageStudioCenterRequest = ImageStudioCenterRequestDto;

// --- Composite ---

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
