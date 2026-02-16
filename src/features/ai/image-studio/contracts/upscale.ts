import { z } from 'zod';

export const IMAGE_STUDIO_UPSCALE_MIN_SCALE = 1;
export const IMAGE_STUDIO_UPSCALE_MAX_SCALE = 8;
export const IMAGE_STUDIO_UPSCALE_MAX_SOURCE_SIDE_PX = 16_384;
export const IMAGE_STUDIO_UPSCALE_MAX_SOURCE_PIXELS = 120_000_000;
export const IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX = 32_768;
export const IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_PIXELS = 220_000_000;

export const imageStudioUpscaleModeSchema = z.enum(['client_data_url', 'server_sharp']);
export type ImageStudioUpscaleMode = z.infer<typeof imageStudioUpscaleModeSchema>;
export const imageStudioUpscaleStrategySchema = z.enum(['scale', 'target_resolution']);
export type ImageStudioUpscaleStrategy = z.infer<typeof imageStudioUpscaleStrategySchema>;

export const imageStudioUpscaleSmoothingQualitySchema = z.enum(['low', 'medium', 'high']);
export type ImageStudioUpscaleSmoothingQuality = z.infer<typeof imageStudioUpscaleSmoothingQualitySchema>;

export const imageStudioUpscaleRequestSchema = z.object({
  mode: imageStudioUpscaleModeSchema.default('server_sharp'),
  strategy: imageStudioUpscaleStrategySchema.optional(),
  scale: z.number().finite().gt(IMAGE_STUDIO_UPSCALE_MIN_SCALE).max(IMAGE_STUDIO_UPSCALE_MAX_SCALE).optional(),
  targetWidth: z.number().int().positive().max(IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX).optional(),
  targetHeight: z.number().int().positive().max(IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX).optional(),
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
export type ImageStudioUpscaleRequest = z.infer<typeof imageStudioUpscaleRequestSchema>;

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
