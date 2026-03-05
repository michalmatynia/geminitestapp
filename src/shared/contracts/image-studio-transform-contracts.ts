import { z } from 'zod';

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
export type ImageStudioCropMode = z.infer<typeof imageStudioCropModeSchema>;

export const imageStudioCropPointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});
export type ImageStudioCropPoint = z.infer<typeof imageStudioCropPointSchema>;
export type ImageStudioCropPointDto = ImageStudioCropPoint;

export const imageStudioCropRectSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type ImageStudioCropRect = z.infer<typeof imageStudioCropRectSchema>;
export type ImageStudioCropRectDto = ImageStudioCropRect;

export const imageStudioCropCanvasFrameSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type ImageStudioCropCanvasFrame = z.infer<typeof imageStudioCropCanvasFrameSchema>;

export const imageStudioCropCanvasContextSchema = z.object({
  canvasWidth: z.number().int().min(1).max(32_768),
  canvasHeight: z.number().int().min(1).max(32_768),
  imageFrame: imageStudioCropCanvasFrameSchema,
});
export type ImageStudioCropCanvasContext = z.infer<typeof imageStudioCropCanvasContextSchema>;

export const imageStudioCropDiagnosticsSchema = z.object({
  rawCanvasBounds: imageStudioCropRectSchema.nullable().optional(),
  mappedImageBounds: imageStudioCropRectSchema.nullable().optional(),
  imageContentFrame: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      width: z.number().finite().positive(),
      height: z.number().finite().positive(),
    })
    .nullable()
    .optional(),
  usedImageContentFrameMapping: z.boolean().optional(),
});
export type ImageStudioCropDiagnostics = z.infer<typeof imageStudioCropDiagnosticsSchema>;

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

export type ImageStudioCropRequest = z.infer<typeof imageStudioCropRequestSchema>;
export type ImageStudioCropRequestDto = ImageStudioCropRequest;

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
export type ImageStudioUpscaleMode = z.infer<typeof imageStudioUpscaleModeSchema>;
export type ImageStudioUpscaleModeDto = ImageStudioUpscaleMode;

export const imageStudioUpscaleStrategySchema = z.enum(['scale', 'target_resolution']);
export type ImageStudioUpscaleStrategy = z.infer<typeof imageStudioUpscaleStrategySchema>;
export type ImageStudioUpscaleStrategyDto = ImageStudioUpscaleStrategy;

export const imageStudioUpscaleSmoothingQualitySchema = z.enum(['low', 'medium', 'high']);
export type ImageStudioUpscaleSmoothingQuality = z.infer<
  typeof imageStudioUpscaleSmoothingQualitySchema
>;
export type ImageStudioUpscaleSmoothingQualityDto = ImageStudioUpscaleSmoothingQuality;

export const imageStudioUpscaleRequestSchema = z
  .object({
    mode: imageStudioUpscaleModeSchema.default('server_sharp'),
    strategy: imageStudioUpscaleStrategySchema.optional(),
    scale: z.number().finite().gt(1).max(8).optional(),
    targetWidth: z.number().int().positive().optional(),
    targetHeight: z.number().int().positive().optional(),
    smoothingQuality: imageStudioUpscaleSmoothingQualitySchema.optional(),
    dataUrl: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(180).optional(),
    requestId: z.string().trim().min(8).max(160).optional(),
  })
  .superRefine((value, ctx) => {
    const inferredStrategy =
      value.strategy ??
      (typeof value.targetWidth === 'number' || typeof value.targetHeight === 'number'
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

export type ImageStudioUpscaleRequest = z.infer<typeof imageStudioUpscaleRequestSchema>;
export type ImageStudioUpscaleRequestDto = ImageStudioUpscaleRequest;

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

const IMAGE_STUDIO_CENTER_MODE_VALUES = [
  'client_alpha_bbox',
  'server_alpha_bbox',
  'client_object_layout',
  'server_object_layout',
  'client_white_bg_bbox',
] as const;

export const imageStudioCenterModeSchema = z.enum(IMAGE_STUDIO_CENTER_MODE_VALUES);

export type ImageStudioCenterMode = z.infer<typeof imageStudioCenterModeSchema>;

export const normalizeImageStudioCenterMode = (
  value: string | null | undefined
): ImageStudioCenterMode | null => {
  if (typeof value !== 'string') return null;
  const parsed = imageStudioCenterModeSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
};

export const imageStudioCenterDetectionModeSchema = z.enum([
  'auto',
  'alpha_bbox',
  'white_bg_first_colored_pixel',
]);
export type ImageStudioCenterDetectionMode = z.infer<typeof imageStudioCenterDetectionModeSchema>;

export const imageStudioCenterShadowPolicySchema = z.enum([
  'auto',
  'include_shadow',
  'exclude_shadow',
]);
export type ImageStudioCenterShadowPolicy = z.infer<typeof imageStudioCenterShadowPolicySchema>;

export const imageStudioCenterObjectBoundsSchema = z.object({
  left: z.number().int().min(0),
  top: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ImageStudioCenterObjectBounds = z.infer<typeof imageStudioCenterObjectBoundsSchema>;

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
export type ImageStudioCenterLayoutConfig = z.infer<typeof imageStudioCenterLayoutConfigSchema>;

export const imageStudioCenterRequestSchema = z.object({
  mode: imageStudioCenterModeSchema,
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioCenterRequest = z.infer<typeof imageStudioCenterRequestSchema>;
