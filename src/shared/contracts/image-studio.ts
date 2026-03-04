import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema, type ImageFileRecord } from './files';
export type { ImageFileRecord };
import { asset3DRecordSchema } from './viewer3d';

export * from './image-studio-shared';

import {
  imageStudioCenterModeSchema,
  imageStudioCenterLayoutConfigSchema,
  imageStudioCenterObjectBoundsSchema,
  imageStudioCenterDetectionModeSchema,
  imageStudioCenterShadowPolicySchema,
  type ImageStudioCenterMode,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterShadowPolicy,
} from './image-studio-shared';

export * from './image-studio-composite';

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ImageStudioRunHistoryEventSource = 'api' | 'queue' | 'worker' | 'stream' | 'client';

export type ImageStudioRunHistoryEvent = {
  id: string;
  type: string;
  source: ImageStudioRunHistoryEventSource;
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline' | null;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs: Array<{ id: string; filepath: string }>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioRunHistoryEvent[];
};

// --- Sequence Runs ---

export type ImageStudioSequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImageStudioSequenceRunDispatchMode = 'queued' | 'inline';

export type ImageStudioSequenceRunHistoryEventSource =
  | 'api'
  | 'queue' | 'worker' | 'stream' | 'client';

export type ImageStudioSequenceMaskContext = {
  polygons: Array<Array<{ x: number; y: number }>>;
  invert: boolean;
  feather: number;
  slotId?: string | null;
} | null;

export type ImageStudioSequenceRunRequest = {
  projectId: string;
  sourceSlotId: string;
  prompt: string;
  paramsState: Record<string, unknown> | null;
  referenceSlotIds: string[];
  steps: unknown[]; // Avoid circular dependency with studio-settings for now or move steps to contract
  mask: ImageStudioSequenceMaskContext;
  studioSettings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type ImageStudioSequenceRunHistoryEvent = {
  id: string;
  type: string;
  source: ImageStudioSequenceRunHistoryEventSource;
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

export type ImageStudioSequenceRunRecord = {
  id: string;
  projectId: string;
  sourceSlotId: string;
  currentSlotId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioSequenceRunDispatchMode | null;
  request: ImageStudioSequenceRunRequest;
  activeStepIndex: number | null;
  activeStepId: string | null;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
  cancelRequested: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioSequenceRunHistoryEvent[];
};

export type RunStudioEnqueueResult = {
  ok: boolean;
  runId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline';
  expectedOutputs: number;
};

export type ImageStudioRunsResponse = {
  runs: ImageStudioRunRecord[];
  total: number;
};

// --- Run Execution ---

export const imageStudioRunMaskSchema = z.union([
  z.object({
    type: z.literal('polygon'),
    points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3),
    closed: z.boolean(),
  }),
  z.object({
    type: z.literal('polygons'),
    polygons: z
      .array(z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3))
      .min(1),
    invert: z.boolean().optional(),
    feather: z.number().min(0).max(50).optional(),
  }),
]);

export type ImageStudioRunMask = z.infer<typeof imageStudioRunMaskSchema>;

export const imageStudioRunCenterSchema = z.object({
  mode: imageStudioCenterModeSchema.default('server_alpha_bbox'),
  dataUrl: z.string().trim().min(1).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioRunCenter = z.infer<typeof imageStudioRunCenterSchema>;

export const imageStudioRunRequestSchema = z.object({
  projectId: z.string().min(1).max(120),
  operation: z.enum(['generate', 'center_object']).default('generate').optional(),
  asset: z
    .object({
      filepath: z.string().min(1),
      id: z.string().optional(),
    })
    .optional(),
  referenceAssets: z
    .array(
      z.object({
        filepath: z.string().min(1),
        id: z.string().optional(),
      })
    )
    .optional(),
  prompt: z.string().min(1),
  mask: imageStudioRunMaskSchema.nullable().optional(),
  center: imageStudioRunCenterSchema.optional(),
  studioSettings: z.record(z.string(), z.unknown()).optional(),
});

export type ImageStudioRunRequest = z.infer<typeof imageStudioRunRequestSchema>;
export type RunStudioPayload = ImageStudioRunRequest;

export type ImageStudioGenerationExecutionMeta = {
  operation: 'generate';
  modelRequested: string;
  modelUsed: string;
  outputFormat: 'png' | 'jpeg' | 'webp';
  requestedOutputCount: number;
  responseImageCount: number;
  inputImageCount: number;
  usedMask: boolean;
  requestedSize: string | null;
  effectiveSize: string | null;
  requestedQuality: string | null;
  effectiveQuality: string | null;
  requestedBackground: string | null;
  effectiveBackground: string | null;
  unknownParameterDrops: string[];
  usedDalle2ModelFallback: boolean;
  apiAttemptCount: number;
};

export type ImageStudioCenterExecutionMeta = {
  operation: 'center_object';
  mode: ImageStudioCenterMode;
  outputFormat: 'png' | 'jpeg' | 'webp';
  requestedOutputCount: 1;
  responseImageCount: 1;
  inputImageCount: 1;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    shadowPolicy: 'auto' | 'include_shadow' | 'exclude_shadow';
    detectionUsed: ImageStudioCenterDetectionMode | null;
    scale: number | null;
  } | null;
};

export type ImageStudioRunExecutionMeta =
  | ImageStudioGenerationExecutionMeta
  | ImageStudioCenterExecutionMeta;

export type ImageStudioRunExecutionResult = {
  projectId: string;
  outputs: ImageFileRecord[];
  executionMeta: ImageStudioRunExecutionMeta;
};
