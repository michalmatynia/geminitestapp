import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { aiNodeSchema, edgeSchema } from './ai-paths-core';
import { aiPathRunSchema, aiPathRunStatusSchema } from './ai-paths-runtime';

export const aiPathRunRecordSchema = aiPathRunSchema.extend({
  recordingPath: z.string().nullable().optional(),
  planState: z.record(z.string(), z.unknown()).nullable().optional(),
  activeStepId: z.string().nullable().optional(),
  checkpointedAt: z.string().nullable().optional(),
  graph: z
    .object({
      nodes: z.array(z.lazy(() => aiNodeSchema)),
      edges: z.array(z.lazy(() => edgeSchema)),
    })
    .nullable()
    .optional(),
  runtimeState: z.unknown().nullable().optional(),
  _count: z
    .object({
      browserSnapshots: z.number().optional(),
      browserLogs: z.number().optional(),
    })
    .optional(),
});
export type AiPathRunRecord = z.infer<typeof aiPathRunRecordSchema>;

export const aiPathRunResultResponseSchema = z.object({
  run: aiPathRunRecordSchema,
});
export type AiPathRunResultResponse = z.infer<typeof aiPathRunResultResponseSchema>;

const nonEmptyTrimmedStringSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1));

export const aiPathRunEnqueueRequestSchema = z.object({
  pathId: z.string().trim().min(1),
  pathName: z.string().trim().optional(),
  nodes: z.array(aiNodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
  triggerEvent: z.string().trim().optional(),
  triggerNodeId: z.string().trim().optional(),
  triggerContext: z.record(z.string(), z.unknown()).optional().nullable(),
  entityId: z.string().trim().optional().nullable(),
  entityType: z.string().trim().optional().nullable(),
  maxAttempts: z.number().int().min(1).max(50).optional(),
  backoffMs: z.number().int().min(0).max(60_000).optional(),
  backoffMaxMs: z.number().int().min(0).max(10 * 60_000).optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});
export type AiPathRunEnqueueRequest = z.infer<typeof aiPathRunEnqueueRequestSchema>;

const aiPathRunEnqueueRunObjectSchema = z
  .object({
    id: nonEmptyTrimmedStringSchema.optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
    _id: nonEmptyTrimmedStringSchema.optional(),
  })
  .passthrough();

const aiPathRunEnqueueEnvelopeCandidateSchema = z
  .object({
    run: z.union([nonEmptyTrimmedStringSchema, aiPathRunEnqueueRunObjectSchema]).optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
  })
  .passthrough();

const readRunIdFromEnqueueEnvelopeCandidate = (
  value: z.infer<typeof aiPathRunEnqueueEnvelopeCandidateSchema>
): string | null => {
  if (typeof value.runId === 'string' && value.runId.length > 0) {
    return value.runId;
  }
  if (typeof value.run === 'string' && value.run.length > 0) {
    return value.run;
  }
  if (!value.run || typeof value.run !== 'object' || Array.isArray(value.run)) {
    return null;
  }
  const run = value.run as Record<string, unknown>;
  const candidates = [run['id'], run['runId'], run['_id']];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (normalized.length > 0) return normalized;
  }
  return null;
};

export const extractAiPathRunIdFromEnqueueContractPayload = (value: unknown): string | null => {
  const parsed = aiPathRunEnqueueEnvelopeCandidateSchema.safeParse(value);
  if (parsed.success) {
    const runId = readRunIdFromEnqueueEnvelopeCandidate(parsed.data);
    if (runId) return runId;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record['data'];
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null;
  const nestedParsed = aiPathRunEnqueueEnvelopeCandidateSchema.safeParse(nested);
  if (!nestedParsed.success) return null;
  return readRunIdFromEnqueueEnvelopeCandidate(nestedParsed.data);
};

export const aiPathRunEnqueueResponseSchema = z
  .object({
    run: z.union([nonEmptyTrimmedStringSchema, aiPathRunEnqueueRunObjectSchema]).optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
    data: aiPathRunEnqueueEnvelopeCandidateSchema.optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (extractAiPathRunIdFromEnqueueContractPayload(value)) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AI Paths enqueue response must include a non-empty run identifier.',
      path: ['runId'],
    });
  });
export type AiPathRunEnqueueResponse = z.infer<typeof aiPathRunEnqueueResponseSchema>;

export const AI_PATH_RUN_ENQUEUED_EVENT_NAME = 'ai-path-run-enqueued';
export const AI_PATH_RUN_QUEUE_CHANNEL = 'ai-path-queue';

export const aiPathRunEnqueuedEventSchema = z.object({
  type: z.literal('run-enqueued').optional().default('run-enqueued'),
  runId: nonEmptyTrimmedStringSchema,
  entityId: nonEmptyTrimmedStringSchema.nullish().transform((value) => value ?? null),
  entityType: nonEmptyTrimmedStringSchema
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  run: aiPathRunRecordSchema.optional(),
  at: z.number().int().nonnegative().optional(),
});
export type AiPathRunEnqueuedEvent = z.infer<typeof aiPathRunEnqueuedEventSchema>;

export const parseAiPathRunEnqueuedEventPayload = (
  value: unknown
): AiPathRunEnqueuedEvent | null => {
  const parsed = aiPathRunEnqueuedEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const createAiPathRunSchema = aiPathRunSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
  })
  .extend({
    status: aiPathRunStatusSchema.optional(),
  });
export type AiPathRunUpdateInput = Partial<z.infer<typeof createAiPathRunSchema>>;
