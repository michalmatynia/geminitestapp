import { z } from 'zod';

import {
  playwrightStepCodeSnapshotSchema,
  playwrightStepInputBindingSchema,
  playwrightStepSelectorResolutionSchema,
} from '@/shared/contracts/playwright-steps';

export const PLAYWRIGHT_ACTION_RUNS_COLLECTION = 'playwright_action_runs';
export const PLAYWRIGHT_ACTION_RUN_STEPS_COLLECTION = 'playwright_action_run_steps';

export const playwrightActionRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type PlaywrightActionRunStatus = z.infer<typeof playwrightActionRunStatusSchema>;

export const playwrightActionRunStepStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'error',
  'skipped',
  'completed',
  'failed',
]);

export type PlaywrightActionRunStepStatus = z.infer<typeof playwrightActionRunStepStatusSchema>;

export const playwrightActionRunStepDetailSchema = z.object({
  label: z.string().min(1),
  value: z.string().nullable().optional(),
});

export type PlaywrightActionRunStepDetail = z.infer<
  typeof playwrightActionRunStepDetailSchema
>;

export const playwrightActionRunArtifactSchema = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

export type PlaywrightActionRunArtifact = z.infer<typeof playwrightActionRunArtifactSchema>;

export const playwrightActionRunRequestSummarySchema = z.object({
  startUrl: z.string().nullable().optional(),
  browserEngine: z.string().nullable().optional(),
  timeoutMs: z.number().nullable().optional(),
  runtimeKey: z.string().nullable().optional(),
  actionId: z.string().nullable().optional(),
  actionName: z.string().nullable().optional(),
  selectorProfile: z.string().nullable().optional(),
  input: z.record(z.string(), z.unknown()).nullable().optional(),
  capture: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type PlaywrightActionRunRequestSummary = z.infer<
  typeof playwrightActionRunRequestSummarySchema
>;

export const playwrightActionRunCodeSnapshotSchema = z.object({
  language: z.literal('playwright-ts'),
  semanticSnippet: z.string(),
  resolvedSnippet: z.string(),
  unresolvedBindings: z.array(z.string()),
  generatedAt: z.string().nullable().optional(),
});

export type PlaywrightActionRunCodeSnapshot = z.infer<
  typeof playwrightActionRunCodeSnapshotSchema
>;

export const playwrightActionRunRecordSchema = z.object({
  runId: z.string(),
  ownerUserId: z.string().nullable(),
  actionId: z.string().nullable(),
  actionName: z.string(),
  runtimeKey: z.string().nullable(),
  personaId: z.string().nullable(),
  status: playwrightActionRunStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  selectorProfile: z.string().nullable(),
  websiteId: z.string().nullable(),
  flowId: z.string().nullable(),
  connectionId: z.string().nullable(),
  integrationId: z.string().nullable(),
  listingId: z.string().nullable(),
  instanceKind: z.string().nullable(),
  instanceFamily: z.string().nullable(),
  instanceLabel: z.string().nullable(),
  tags: z.array(z.string()),
  request: playwrightActionRunRequestSummarySchema.nullable(),
  codeSnapshot: playwrightActionRunCodeSnapshotSchema.nullable().optional(),
  result: z.unknown().optional(),
  error: z.string().nullable(),
  artifacts: z.array(playwrightActionRunArtifactSchema),
  logs: z.array(z.string()),
  stepCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightActionRunRecord = z.infer<typeof playwrightActionRunRecordSchema>;

export const playwrightActionRunStepRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  parentStepId: z.string().nullable(),
  sequenceIndex: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  kind: z.string(),
  refId: z.string().nullable(),
  label: z.string(),
  stepType: z.string().nullable(),
  selector: z.string().nullable(),
  selectorKey: z.string().nullable(),
  selectorProfile: z.string().nullable(),
  status: playwrightActionRunStepStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  attempt: z.number().int().positive().nullable(),
  message: z.string().nullable(),
  warning: z.string().nullable(),
  details: z.array(playwrightActionRunStepDetailSchema),
  codeSnapshot: playwrightStepCodeSnapshotSchema.nullable().optional(),
  inputBindings: z.record(z.string(), playwrightStepInputBindingSchema).optional(),
  selectorResolution: z.array(playwrightStepSelectorResolutionSchema).optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  artifacts: z.array(playwrightActionRunArtifactSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightActionRunStepRecord = z.infer<
  typeof playwrightActionRunStepRecordSchema
>;

export type PlaywrightActionRunSummary = Pick<
  PlaywrightActionRunRecord,
  | 'runId'
  | 'actionId'
  | 'actionName'
  | 'runtimeKey'
  | 'status'
  | 'startedAt'
  | 'completedAt'
  | 'durationMs'
  | 'selectorProfile'
  | 'connectionId'
  | 'integrationId'
  | 'instanceKind'
  | 'instanceFamily'
  | 'instanceLabel'
  | 'tags'
  | 'stepCount'
  | 'createdAt'
  | 'updatedAt'
>;

export type PlaywrightActionRunListFilters = {
  actionId?: string;
  runtimeKey?: string;
  status?: PlaywrightActionRunStatus | 'all';
  selectorProfile?: string;
  instanceKind?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

export type PlaywrightActionRunListResponse = {
  runs: PlaywrightActionRunSummary[];
  nextCursor: string | null;
  total: number;
};

export type PlaywrightActionRunDetailResponse = {
  run: PlaywrightActionRunRecord;
  steps: PlaywrightActionRunStepRecord[];
};
