import { z } from 'zod';
import { contextRegistryConsumerEnvelopeSchema } from '../ai-context-registry';
import {
  imageStudioCenterModeSchema,
  imageStudioCenterLayoutConfigSchema,
} from '../image-studio-transform-contracts';
import {
  type ImageStudioRunStatus,
  type ImageStudioRunHistoryEvent,
  type ImageFileRecord,
  type RunsTotalResponseDto,
} from './base';

export type { ImageStudioRunHistoryEvent };

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
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioRunRequest = z.infer<typeof imageStudioRunRequestSchema>;
export type RunStudioPayload = ImageStudioRunRequest;

export type ImageStudioRunOutputRecord = ImageFileRecord;

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline' | null;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs: ImageFileRecord[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioRunHistoryEvent[];
};

export type ImageStudioRunDetailResponse = {
  run: ImageStudioRunRecord;
};

export type ImageStudioRunsResponse = RunsTotalResponseDto<ImageStudioRunRecord>;

export const imageStudioRunDispatchModeSchema = z.enum(['queued', 'inline']);
export type ImageStudioRunDispatchMode = z.infer<typeof imageStudioRunDispatchModeSchema>;

export type RunStudioEnqueueResult = {
  ok: boolean;
  runId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline';
  expectedOutputs: number;
};
