import { z } from 'zod';
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
  'client_white_bg_bbox',
]);

export type ImageStudioCenterMode = z.infer<typeof imageStudioCenterModeSchema>;

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

export const imageStudioAnalysisModeSchema = z.enum(['client_analysis_v1', 'server_analysis_v1']);
export type ImageStudioAnalysisMode = z.infer<typeof imageStudioAnalysisModeSchema>;

export const imageStudioAnalysisRequestSchema = z.object({
  mode: imageStudioAnalysisModeSchema.optional().default('server_analysis_v1'),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAnalysisRequest = z.infer<typeof imageStudioAnalysisRequestSchema>;

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
export type ImageStudioAutoScalerMode = z.infer<typeof imageStudioAutoScalerModeSchema>;

export const imageStudioAutoScalerRequestSchema = z.object({
  mode: imageStudioAutoScalerModeSchema,
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAutoScalerRequest = z.infer<typeof imageStudioAutoScalerRequestSchema>;

