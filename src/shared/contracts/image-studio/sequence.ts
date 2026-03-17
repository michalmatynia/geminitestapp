import { z } from 'zod';
import { contextRegistryConsumerEnvelopeSchema } from '../ai-context-registry';
import {
  type ImageStudioRunDispatchMode,
  type ImageStudioRunHistoryEvent,
} from './run';

export type ImageStudioSequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImageStudioSequenceRunDispatchMode = ImageStudioRunDispatchMode;

export type ImageStudioSequenceRunHistoryEventSource =
  | 'api'
  | 'queue'
  | 'worker'
  | 'stream'
  | 'client';

export type ImageStudioSequenceRunHistoryEvent = ImageStudioRunHistoryEvent;

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
  steps: unknown[];
  mask: ImageStudioSequenceMaskContext;
  studioSettings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  contextRegistry?: z.infer<typeof contextRegistryConsumerEnvelopeSchema> | null;
};

const imageStudioSequencePointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const imageStudioSequenceRunStartRequestSchema = z.object({
  projectId: z.string().trim().min(1),
  sourceSlotId: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  paramsState: z.record(z.string(), z.unknown()).nullable().optional(),
  referenceSlotIds: z.array(z.string().trim().min(1)).optional(),
  mask: z
    .object({
      polygons: z.array(z.array(imageStudioSequencePointSchema).min(3)).min(1),
      invert: z.boolean().optional(),
      feather: z.number().min(0).max(50).optional(),
    })
    .nullable()
    .optional(),
  studioSettings: z.record(z.string(), z.unknown()).nullable().optional(),
  steps: z.array(z.unknown()).optional(),
  presetId: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioSequenceRunStartRequest = z.infer<
  typeof imageStudioSequenceRunStartRequestSchema
>;

export type ImageStudioSequenceRunRecord = {
  id: string;
  projectId: string;
  sourceSlotId: string;
  currentSlotId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioRunDispatchMode | null;
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
  historyEvents: ImageStudioRunHistoryEvent[];
};

export type ImageStudioSequenceRunStartResponseDto = {
  runId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioRunDispatchMode;
  currentSlotId: string;
  stepCount: number;
};
export type ImageStudioSequenceRunStartResponse = ImageStudioSequenceRunStartResponseDto;
