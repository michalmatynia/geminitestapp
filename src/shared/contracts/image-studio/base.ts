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
