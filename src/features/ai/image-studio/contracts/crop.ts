import { z } from 'zod';

export const IMAGE_STUDIO_CROP_MAX_SOURCE_SIDE_PX = 16_384;
export const IMAGE_STUDIO_CROP_MAX_SOURCE_PIXELS = 120_000_000;
export const IMAGE_STUDIO_CROP_MAX_OUTPUT_PIXELS = 80_000_000;

export const imageStudioCropModeSchema = z.enum(['client_bbox', 'server_bbox', 'server_polygon']);
export type ImageStudioCropMode = z.infer<typeof imageStudioCropModeSchema>;

export const imageStudioCropPointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});
export type ImageStudioCropPoint = z.infer<typeof imageStudioCropPointSchema>;

export const imageStudioCropRectSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type ImageStudioCropRect = z.infer<typeof imageStudioCropRectSchema>;

export const imageStudioCropRequestSchema = z
  .object({
    mode: imageStudioCropModeSchema,
    cropRect: imageStudioCropRectSchema.optional(),
    polygon: z.array(imageStudioCropPointSchema).min(3).optional(),
    dataUrl: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(180).optional(),
    requestId: z.string().trim().min(8).max(160).optional(),
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
