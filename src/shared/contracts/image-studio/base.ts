import { z } from 'zod';
import { type ImageFileRecord } from '../files';

export type { ImageFileRecord };

import { type Status as ImageStudioRunStatus } from '../base';
export type { ImageStudioRunStatus };

export type ImageStudioRunHistoryEventSource = 'api' | 'queue' | 'worker' | 'stream' | 'client';

export type ImageStudioRunHistoryEvent = {
  id: string;
  type: string;
  source: ImageStudioRunHistoryEventSource;
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

/**
 * Error codes for Image Studio analysis operations.
 * Tracks failures during image analysis and validation.
 */
export const IMAGE_STUDIO_ANALYSIS_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_ANALYSIS_INVALID_PAYLOAD',                     // Request payload validation failed
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_SLOT_MISSING',             // Required image slot not provided
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_MISSING',           // Source image not found
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_INVALID',           // Source image format invalid
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_DIMENSIONS_INVALID', // Image dimensions out of bounds
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_ANALYSIS_SOURCE_OBJECT_NOT_FOUND',     // Referenced object not found
  OUTPUT_INVALID: 'IMAGE_STUDIO_ANALYSIS_OUTPUT_INVALID',                       // Analysis output validation failed
} as const;

export type ImageStudioAnalysisErrorCode =
  (typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES)[keyof typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES];

/**
 * Error codes for Image Studio autoscaler operations.
 * Tracks failures during image upscaling and processing.
 */
export const IMAGE_STUDIO_AUTOSCALER_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_AUTOSCALER_INVALID_PAYLOAD',                   // Request payload validation failed
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_SLOT_MISSING',           // Required image slot not provided
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_MISSING',         // Source image not found
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_INVALID',         // Source image format invalid
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_DIMENSIONS_INVALID', // Image dimensions out of bounds
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_TOO_LARGE',     // Image exceeds size limit
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_OBJECT_NOT_FOUND',   // Referenced object not found
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_IMAGE_REQUIRED',       // Client must provide image
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_DATA_URL_INVALID',   // Data URL format invalid
  OUTPUT_INVALID: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_INVALID',                     // Upscaled output validation failed
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_PERSIST_FAILED',       // Failed to save output image
} as const;

export type ImageStudioAutoScalerErrorCode =
  (typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES)[keyof typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES];

export const imageStudioOperationLifecycleSchema = z.object({
  state: z.enum(['analyzed', 'persisted']),
  durationMs: z.number().int().nonnegative(),
});

export type ImageStudioOperationLifecycle = z.infer<typeof imageStudioOperationLifecycleSchema>;

export type UploadedImageBinaryDto = {
  buffer: Buffer;
  mime: string;
};
export type {
  UploadedImageBinaryDto as UploadedImageBinary,
  UploadedImageBinaryDto as UploadedClientAnalysisImage,
  UploadedImageBinaryDto as UploadedClientCenterImage,
  UploadedImageBinaryDto as UploadedClientCropImage,
  UploadedImageBinaryDto as UploadedClientAutoScaleImage,
};

export type RunsTotalResponseDto<TRun> = {
  runs: TRun[];
  total: number;
};
export type RunsTotalResponse<TRun> = RunsTotalResponseDto<TRun>;
