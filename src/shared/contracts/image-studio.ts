import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema } from './files';
import { asset3DRecordSchema } from './viewer3d';

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

export const imageStudioCropCanvasFrameSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type ImageStudioCropCanvasFrameDto = z.infer<typeof imageStudioCropCanvasFrameSchema>;
export type ImageStudioCropCanvasFrame = ImageStudioCropCanvasFrameDto;

export const imageStudioCropCanvasContextSchema = z.object({
  canvasWidth: z.number().int().min(1).max(32_768),
  canvasHeight: z.number().int().min(1).max(32_768),
  imageFrame: imageStudioCropCanvasFrameSchema,
});
export type ImageStudioCropCanvasContextDto = z.infer<typeof imageStudioCropCanvasContextSchema>;
export type ImageStudioCropCanvasContext = ImageStudioCropCanvasContextDto;

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
    canvasContext: imageStudioCropCanvasContextSchema.optional(),
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
export const IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX = 1;
export const IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX = 32_768;

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

export const imageStudioCenterShadowPolicySchema = z.enum([
  'auto',
  'include_shadow',
  'exclude_shadow',
]);
export type ImageStudioCenterShadowPolicyDto = z.infer<typeof imageStudioCenterShadowPolicySchema>;

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
  fillMissingCanvasWhite: z.boolean().optional(),
  targetCanvasWidth: z
    .number()
    .int()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX)
    .optional(),
  targetCanvasHeight: z
    .number()
    .int()
    .min(IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX)
    .max(IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX)
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
  shadowPolicy: imageStudioCenterShadowPolicySchema.optional(),
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

export const IMAGE_STUDIO_ANALYSIS_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_ANALYSIS_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_DIMENSIONS_INVALID',
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_ANALYSIS_SOURCE_OBJECT_NOT_FOUND',
  OUTPUT_INVALID: 'IMAGE_STUDIO_ANALYSIS_OUTPUT_INVALID',
} as const;

export type ImageStudioAnalysisErrorCode =
  (typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES)[keyof typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES];

export const imageStudioAnalysisModeSchema = z.enum([
  'client_analysis_v1',
  'server_analysis_v1',
]);
export type ImageStudioAnalysisModeDto = z.infer<typeof imageStudioAnalysisModeSchema>;

export const imageStudioAnalysisRequestSchema = z.object({
  mode: imageStudioAnalysisModeSchema.optional().default('server_analysis_v1'),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAnalysisRequestDto = z.infer<typeof imageStudioAnalysisRequestSchema>;
export type ImageStudioAnalysisRequest = ImageStudioAnalysisRequestDto;

export const IMAGE_STUDIO_AUTOSCALER_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_AUTOSCALER_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_DIMENSIONS_INVALID',
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_TOO_LARGE',
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_OBJECT_NOT_FOUND',
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_IMAGE_REQUIRED',
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_DATA_URL_INVALID',
  OUTPUT_INVALID: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_INVALID',
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_PERSIST_FAILED',
} as const;

export type ImageStudioAutoScalerErrorCode =
  (typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES)[keyof typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES];

export const imageStudioAutoScalerModeSchema = z.enum([
  'client_auto_scaler_v1',
  'server_auto_scaler_v1',
]);
export type ImageStudioAutoScalerModeDto = z.infer<typeof imageStudioAutoScalerModeSchema>;

export const imageStudioAutoScalerRequestSchema = z.object({
  mode: imageStudioAutoScalerModeSchema,
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAutoScalerRequestDto = z.infer<typeof imageStudioAutoScalerRequestSchema>;
export type ImageStudioAutoScalerRequest = ImageStudioAutoScalerRequestDto;

// --- Composite ---

export const compositeLayerConfigSchema = z.object({
  slotId: z.string(),
  order: z.number(),
  opacity: z.number().optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional(),
});

export type CompositeLayerConfigDto = z.infer<typeof compositeLayerConfigSchema>;
export type CompositeLayerConfig = CompositeLayerConfigDto;

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
  autoscale: z.record(z.string(), z.unknown()).optional(),
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
export type SlotGenerationMetadata = SlotGenerationMetadataDto;

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

export type ImageStudioSlotDto = z.infer<typeof imageStudioSlotSchema>;
export type ImageStudioSlotRecord = ImageStudioSlotDto;

export const imageStudioProjectSchema = dtoBaseSchema.extend({
  canvasWidthPx: z.number().nullable(),
  canvasHeightPx: z.number().nullable(),
});

export type ImageStudioProjectDto = z.infer<typeof imageStudioProjectSchema>;
export type ImageStudioProjectRecord = ImageStudioProjectDto;

export const imageStudioRunDispatchModeSchema = z.enum(['queued', 'inline']);
export type ImageStudioRunDispatchModeDto = z.infer<typeof imageStudioRunDispatchModeSchema>;

export const studioProjectsResponseSchema = z.object({
  projects: z.array(imageStudioProjectSchema),
});

export type StudioProjectsResponseDto = z.infer<typeof studioProjectsResponseSchema>;
export type StudioProjectsResponse = StudioProjectsResponseDto;

export const studioSlotsResponseSchema = z.object({
  slots: z.array(imageStudioSlotSchema),
});

export type StudioSlotsResponseDto = z.infer<typeof studioSlotsResponseSchema>;
export type StudioSlotsResponse = StudioSlotsResponseDto;

const imageStudioObjectDetectionUsedSchema = z.enum([
  'alpha_bbox',
  'white_bg_first_colored_pixel',
]);

export const imageStudioWhitespaceMetricsSchema = z.object({
  px: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
  percent: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
});

export type ImageStudioWhitespaceMetricsDto = z.infer<typeof imageStudioWhitespaceMetricsSchema>;
export type ImageStudioWhitespaceMetrics = ImageStudioWhitespaceMetricsDto;

export const imageStudioNormalizedCenterLayoutSchema = z.object({
  paddingPercent: z.number().finite(),
  paddingXPercent: z.number().finite(),
  paddingYPercent: z.number().finite(),
  fillMissingCanvasWhite: z.boolean(),
  targetCanvasWidth: z.number().int().positive().nullable(),
  targetCanvasHeight: z.number().int().positive().nullable(),
  whiteThreshold: z.number().int().finite(),
  chromaThreshold: z.number().int().finite(),
  shadowPolicy: imageStudioCenterShadowPolicySchema,
  detection: imageStudioCenterDetectionModeSchema,
});

export type ImageStudioNormalizedCenterLayoutDto = z.infer<typeof imageStudioNormalizedCenterLayoutSchema>;
export type ImageStudioNormalizedCenterLayout = ImageStudioNormalizedCenterLayoutDto;

export const imageStudioCenterLayoutMetadataSchema = z.object({
  paddingPercent: z.number().finite(),
  paddingXPercent: z.number().finite(),
  paddingYPercent: z.number().finite(),
  fillMissingCanvasWhite: z.boolean(),
  targetCanvasWidth: z.number().int().positive().nullable(),
  targetCanvasHeight: z.number().int().positive().nullable(),
  whiteThreshold: z.number().int().finite(),
  chromaThreshold: z.number().int().finite(),
  shadowPolicy: imageStudioCenterShadowPolicySchema,
  layoutPolicyVersion: z.string().trim().min(1).nullable().optional(),
  detectionPolicyDecision: z.string().trim().min(1).nullable().optional(),
  detectionUsed: imageStudioCenterDetectionModeSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
});

export type ImageStudioCenterLayoutMetadataDto = z.infer<typeof imageStudioCenterLayoutMetadataSchema>;
export type ImageStudioCenterLayoutMetadata = ImageStudioCenterLayoutMetadataDto;

export const imageStudioAutoScalerLayoutMetadataSchema = z.object({
  paddingPercent: z.number().finite(),
  paddingXPercent: z.number().finite(),
  paddingYPercent: z.number().finite(),
  fillMissingCanvasWhite: z.boolean(),
  targetCanvasWidth: z.number().int().positive().nullable(),
  targetCanvasHeight: z.number().int().positive().nullable(),
  whiteThreshold: z.number().int().finite(),
  chromaThreshold: z.number().int().finite(),
  shadowPolicy: imageStudioCenterShadowPolicySchema.optional(),
  layoutPolicyVersion: z.string().trim().min(1).nullable().optional(),
  detectionPolicyDecision: z.string().trim().min(1).nullable().optional(),
});

export type ImageStudioAutoScalerLayoutMetadataDto = z.infer<typeof imageStudioAutoScalerLayoutMetadataSchema>;
export type ImageStudioAutoScalerLayoutMetadata = ImageStudioAutoScalerLayoutMetadataDto;

export const imageStudioOperationLifecycleSchema = z.object({
  state: z.enum(['analyzed', 'persisted']),
  durationMs: z.number().int().nonnegative(),
});

export type ImageStudioOperationLifecycleDto = z.infer<typeof imageStudioOperationLifecycleSchema>;
export type ImageStudioOperationLifecycle = ImageStudioOperationLifecycleDto;

export const imageStudioDetectionCandidateScoreSchema = z.object({
  confidence: z.number().finite().min(0).max(1),
  area: z.number().int().positive(),
});

export type ImageStudioDetectionCandidateScoreDto = z.infer<typeof imageStudioDetectionCandidateScoreSchema>;
export type ImageStudioDetectionCandidateScore = ImageStudioDetectionCandidateScoreDto;

export const imageStudioDetectionCandidateSummarySchema = z.object({
  alpha_bbox: imageStudioDetectionCandidateScoreSchema.nullable(),
  white_bg_first_colored_pixel: imageStudioDetectionCandidateScoreSchema.nullable(),
});

export type ImageStudioDetectionCandidateSummaryDto = z.infer<typeof imageStudioDetectionCandidateSummarySchema>;
export type ImageStudioDetectionCandidateSummary = ImageStudioDetectionCandidateSummaryDto;

export const imageStudioDetectionDetailsSchema = z.object({
  shadowPolicyRequested: imageStudioCenterShadowPolicySchema,
  shadowPolicyApplied: imageStudioCenterShadowPolicySchema,
  componentCount: z.number().int().nonnegative(),
  coreComponentCount: z.number().int().nonnegative(),
  selectedComponentPixels: z.number().int().nonnegative(),
  selectedComponentCoverage: z.number().finite().min(0).max(1),
  foregroundPixels: z.number().int().nonnegative(),
  corePixels: z.number().int().nonnegative(),
  touchesBorder: z.boolean(),
  maskSource: z.enum(['foreground', 'core']),
  policyVersion: z.string().trim().min(1).optional(),
  policyReason: z.string().trim().min(1).optional(),
  fallbackApplied: z.boolean().optional(),
  candidateDetections: imageStudioDetectionCandidateSummarySchema.optional(),
});

export type ImageStudioDetectionDetailsDto = z.infer<typeof imageStudioDetectionDetailsSchema>;
export type ImageStudioDetectionDetails = ImageStudioDetectionDetailsDto;

export const imageStudioAnalysisSummarySchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema,
  detectionUsed: imageStudioObjectDetectionUsedSchema,
  confidence: z.number().finite().min(0).max(1),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  policyVersion: z.string().trim().min(1),
  policyReason: z.string().trim().min(1),
  fallbackApplied: z.boolean(),
  candidateDetections: imageStudioDetectionCandidateSummarySchema,
  whitespace: imageStudioWhitespaceMetricsSchema,
  objectAreaPercent: z.number().finite(),
  layout: imageStudioNormalizedCenterLayoutSchema,
  suggestedPlan: z.object({
    outputWidth: z.number().int().positive(),
    outputHeight: z.number().int().positive(),
    targetObjectBounds: imageStudioCenterObjectBoundsSchema,
    scale: z.number().finite(),
    whitespace: imageStudioWhitespaceMetricsSchema,
  }),
});

export type ImageStudioAnalysisSummaryDto = z.infer<typeof imageStudioAnalysisSummarySchema>;
export type ImageStudioAnalysisSummary = ImageStudioAnalysisSummaryDto;

export const imageStudioAnalysisResponseSchema = z.object({
  sourceSlotId: z.string(),
  mode: imageStudioAnalysisModeSchema,
  effectiveMode: imageStudioAnalysisModeSchema,
  authoritativeSource: z.enum(['source_slot', 'client_upload']),
  sourceMimeHint: z.string().nullable(),
  analysis: imageStudioAnalysisSummarySchema,
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioAnalysisResponseDto = z.infer<typeof imageStudioAnalysisResponseSchema>;
export type ImageStudioAnalysisResponse = ImageStudioAnalysisResponseDto;

const imageStudioOutputImageSchema = z.object({
  id: z.string(),
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number().finite().nonnegative(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
}).passthrough();

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

export type ImageStudioCropResponseDto = z.infer<typeof imageStudioCropResponseSchema>;
export type ImageStudioCropResponse = ImageStudioCropResponseDto;

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

export type ImageStudioUpscaleResponseDto = z.infer<typeof imageStudioUpscaleResponseSchema>;
export type ImageStudioUpscaleResponse = ImageStudioUpscaleResponseDto;

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
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioCenterResponseDto = z.infer<typeof imageStudioCenterResponseSchema>;
export type ImageStudioCenterResponse = ImageStudioCenterResponseDto;

export const imageStudioAutoScalerResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioAutoScalerModeSchema,
  effectiveMode: imageStudioAutoScalerModeSchema,
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  targetObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  layout: imageStudioAutoScalerLayoutMetadataSchema.nullable().optional(),
  detectionUsed: imageStudioObjectDetectionUsedSchema.nullable().optional(),
  confidenceBefore: z.number().finite().min(0).max(1).nullable().optional(),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
  whitespaceBefore: imageStudioWhitespaceMetricsSchema.nullable().optional(),
  whitespaceAfter: imageStudioWhitespaceMetricsSchema.nullable().optional(),
  objectAreaPercentBefore: z.number().finite().nullable().optional(),
  objectAreaPercentAfter: z.number().finite().nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioAutoScalerResponseDto = z.infer<typeof imageStudioAutoScalerResponseSchema>;
export type ImageStudioAutoScalerResponse = ImageStudioAutoScalerResponseDto;
