import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { dtoBaseSchema } from './base';

/**
 * Agent Runtime DTOs
 */

export const agentDecisionActionSchema = z.enum(['respond', 'tool', 'wait_human']);
export type AgentDecisionAction = z.infer<typeof agentDecisionActionSchema>;

export const agentDecisionSchema = z.object({
  action: agentDecisionActionSchema,
  reason: z.string(),
  toolName: z.string().optional(),
});

export type AgentDecision = z.infer<typeof agentDecisionSchema>;

export const planStepStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type PlanStepStatus = z.infer<typeof planStepStatusSchema>;

export const planStepPhaseSchema = z.enum(['observe', 'act', 'verify', 'recover']);
export type PlanStepPhase = z.infer<typeof planStepPhaseSchema>;

export const planStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: planStepStatusSchema,
  tool: z.enum(['playwright', 'none']).optional(),
  expectedObservation: z.string().nullable().optional(),
  successCriteria: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  subgoalId: z.string().nullable().optional(),
  phase: planStepPhaseSchema.nullable().optional(),
  priority: z.number().nullable().optional(),
  dependsOn: z.array(z.string()).nullable().optional(),
  attempts: z.number().optional(),
  maxAttempts: z.number().optional(),
  snapshotId: z.string().nullable().optional(),
  logCount: z.number().nullable().optional(),
});

export type PlanStep = z.infer<typeof planStepSchema>;

export const plannerCritiqueSchema = z.object({
  assumptions: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  unknowns: z.array(z.string()).optional(),
  safetyChecks: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
});

export type PlannerCritique = z.infer<typeof plannerCritiqueSchema>;

export const plannerAlternativeSchema = z.object({
  title: z.string(),
  rationale: z.string().nullable().optional(),
  steps: z.array(
    z.object({
      title: z.string().optional(),
      tool: z.string().optional(),
      expectedObservation: z.string().optional(),
      successCriteria: z.string().optional(),
      phase: z.string().optional(),
      priority: z.number().optional(),
      dependsOn: z.union([z.array(z.number()), z.array(z.string())]).optional(),
    })
  ),
});

export type PlannerAlternative = z.infer<typeof plannerAlternativeSchema>;

export const plannerMetaSchema = z.object({
  critique: plannerCritiqueSchema.nullable().optional(),
  alternatives: z.array(plannerAlternativeSchema).nullable().optional(),
  safetyChecks: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  taskType: z.enum(['web_task', 'extract_info']).optional(),
  summary: z.string().nullable().optional(),
  constraints: z.array(z.string()).optional(),
  successSignals: z.array(z.string()).optional(),
});

export type PlannerMeta = z.infer<typeof plannerMetaSchema>;

export type PlannerTaskType = 'web_task' | 'extract_info';

export const agentPlanSettingsSchema = z.object({
  maxSteps: z.number(),
  maxStepAttempts: z.number(),
  maxReplanCalls: z.number(),
  replanEverySteps: z.number(),
  maxSelfChecks: z.number(),
  loopGuardThreshold: z.number(),
  loopBackoffBaseMs: z.number(),
  loopBackoffMaxMs: z.number(),
});

export type AgentPlanSettings = z.infer<typeof agentPlanSettingsSchema>;

export const agentPlanPreferencesSchema = z.object({
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
  memoryValidationModel: z.string().optional(),
  plannerModel: z.string().optional(),
  selfCheckModel: z.string().optional(),
  extractionValidationModel: z.string().optional(),
  toolRouterModel: z.string().optional(),
  loopGuardModel: z.string().optional(),
  approvalGateModel: z.string().optional(),
  memorySummarizationModel: z.string().optional(),
  selectorInferenceModel: z.string().optional(),
  outputNormalizationModel: z.string().optional(),
});

export type AgentPlanPreferences = z.infer<typeof agentPlanPreferencesSchema>;

export const agentRuntimeExecutionPreferencesSchema = z.object({
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
});

export type AgentRuntimeExecutionPreferences = z.infer<
  typeof agentRuntimeExecutionPreferencesSchema
>;

export const agentCheckpointSchema = z.object({
  steps: z.array(planStepSchema),
  activeStepId: z.string().nullable(),
  lastError: z.string().nullable().optional(),
  taskType: z.enum(['web_task', 'extract_info']).nullable().optional(),
  resumeRequestedAt: z.string().nullable().optional(),
  resumeProcessedAt: z.string().nullable().optional(),
  approvalRequestedStepId: z.string().nullable().optional(),
  approvalGrantedStepId: z.string().nullable().optional(),
  checkpointBrief: z.string().nullable().optional(),
  checkpointNextActions: z.array(z.string()).nullable().optional(),
  checkpointRisks: z.array(z.string()).nullable().optional(),
  checkpointStepId: z.string().nullable().optional(),
  checkpointCreatedAt: z.string().nullable().optional(),
  summaryCheckpoint: z.number().nullable().optional(),
  settings: agentPlanSettingsSchema.nullable().optional(),
  preferences: agentPlanPreferencesSchema.nullable().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.nullable().optional(),
  updatedAt: z.string(),
});

export type AgentCheckpoint = z.infer<typeof agentCheckpointSchema>;

export const loopSignalSchema = z.object({
  reason: z.string(),
  pattern: z.string(),
  titles: z.array(z.string()),
  urls: z.array(z.string().nullable()),
  statuses: z.array(planStepStatusSchema),
});

export type LoopSignal = z.infer<typeof loopSignalSchema>;

export const extractionPlanSchema = z.object({
  target: z.string().nullable(),
  fields: z.array(z.string()),
  primarySelectors: z.array(z.string()),
  fallbackSelectors: z.array(z.string()),
  notes: z.string().nullable(),
});

export type ExtractionPlan = z.infer<typeof extractionPlanSchema>;

export const failureRecoveryPlanSchema = z.object({
  reason: z.string().nullable(),
  selectors: z.array(z.string()),
  listingUrls: z.array(z.string()),
  clickSelector: z.string().nullable(),
  loginUrl: z.string().nullable(),
  usernameSelector: z.string().nullable(),
  passwordSelector: z.string().nullable(),
  submitSelector: z.string().nullable(),
  notes: z.string().nullable(),
});

export type FailureRecoveryPlan = z.infer<typeof failureRecoveryPlanSchema>;

export const approvalRequestSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepId: z.string(),
  action: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  requestedAt: z.string(),
  decidedAt: z.string().optional(),
});

export interface ApprovalRequestBase {
  id: string;
  runId: string;
  stepId: string;
  action: string;
  context?: Record<string, unknown> | undefined;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  decidedAt?: string | undefined;
}

export type ApprovalRequest = Omit<ApprovalRequestBase, 'requestedAt' | 'decidedAt'> & {
  requestedAt: Date;
  decidedAt?: Date;
};

export type AuditLevel = 'info' | 'warning' | 'error';

export type MemoryScope = 'session' | 'longterm';

export const planHierarchySchema = z.object({
  goals: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      successCriteria: z.string().nullable().optional(),
      priority: z.number().nullable().optional(),
      dependsOn: z
        .union([z.array(z.number()), z.array(z.string())])
        .nullable()
        .optional(),
      subgoals: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          successCriteria: z.string().nullable().optional(),
          priority: z.number().nullable().optional(),
          dependsOn: z
            .union([z.array(z.number()), z.array(z.string())])
            .nullable()
            .optional(),
          steps: z.array(
            z.object({
              title: z.string(),
              tool: z.enum(['playwright', 'none']).optional(),
              expectedObservation: z.string().nullable().optional(),
              successCriteria: z.string().nullable().optional(),
              phase: z.string().nullable().optional(),
              priority: z.number().nullable().optional(),
              dependsOn: z
                .union([z.array(z.number()), z.array(z.string())])
                .nullable()
                .optional(),
            })
          ),
        })
      ),
    })
  ),
});

export type PlanHierarchy = z.infer<typeof planHierarchySchema>;

export const agentToolRequestSchema = z.object({
  tool: z.string(),
  input: z.unknown(),
  runId: z.string(),
  stepId: z.string(),
});

export type AgentToolRequest = z.infer<typeof agentToolRequestSchema>;

export type PlaywrightToolRequest = {
  name: 'playwright';
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

export const agentToolResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  observation: z.string().optional(),
});

export type AgentToolResult = z.infer<typeof agentToolResultSchema>;

export type AgentToolResultV2 = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

export const toolOutputSchema = z.object({
  url: z.string().optional(),
  domText: z.string().optional(),
  snapshotId: z.string().nullable().optional(),
  logCount: z.number().nullable().optional(),
  extractedNames: z.array(z.string()).optional(),
  extractedTotal: z.number().optional(),
  extractedItems: z.array(z.string()).optional(),
  extractionType: z.enum(['product_names', 'emails']).optional(),
  extractionPlan: extractionPlanSchema.nullable().optional(),
  recoveryPlan: failureRecoveryPlanSchema.nullable().optional(),
  cloudflareDetected: z.boolean().optional(),
});

export type ToolOutputDto = z.infer<typeof toolOutputSchema>;
export type ToolOutput = ToolOutputDto;

export const agentControlActionSchema = z.enum(['goto', 'reload', 'snapshot']);
export type AgentControlAction = z.infer<typeof agentControlActionSchema>;

export type AgentToolLog = (
  level: string,
  message: string,
  metadata?: Record<string, unknown>
) => Promise<void>;

export type AgentLlmContext = {
  model: string;
  runId: string;
  log: AgentToolLog;
  activeStepId?: string | null;
  stepLabel?: string | null;
};

export const agentRunStatusTypeSchema = z.enum([
  'queued',
  'running',
  'waiting_human',
  'stopped',
  'failed',
  'completed',
]);
export type AgentRunStatusType = z.infer<typeof agentRunStatusTypeSchema>;

export const agentRunRecordSchema = dtoBaseSchema.extend({
  prompt: z.string(),
  model: z.string().nullable().optional(),
  tools: z.array(z.string()),
  searchProvider: z.string().nullable().optional(),
  agentBrowser: z.string().nullable().optional(),
  personaId: z.string().nullable().optional(),
  runHeadless: z.boolean(),
  status: agentRunStatusTypeSchema,
  logLines: z.array(z.string()),
  requiresHumanIntervention: z.boolean(),
  errorMessage: z.string().nullable().optional(),
  recordingPath: z.string().nullable().optional(),
  activeStepId: z.string().nullable().optional(),
  checkpointedAt: z.string().nullable().optional(),
  _count: z.object({
    browserSnapshots: z.number(),
    browserLogs: z.number(),
  }),
});

export type AgentRunRecordDto = z.infer<typeof agentRunRecordSchema>;
export type AgentRunRecord = AgentRunRecordDto;

export const agentRunsResponseSchema = z.object({
  runs: z.array(agentRunRecordSchema),
});

export type AgentRunsResponseDto = z.infer<typeof agentRunsResponseSchema>;
export type AgentRunsResponse = AgentRunsResponseDto;

export const agentRunEnqueueResponseSchema = z.object({
  runId: z.string(),
  status: agentRunStatusTypeSchema,
});

export type AgentRunEnqueueResponseDto = z.infer<typeof agentRunEnqueueResponseSchema>;
export type AgentRunEnqueueResponse = AgentRunEnqueueResponseDto;

import { type BatchDeleteResponse } from './base';

export const agentRunsDeleteResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: z.number(),
  deleted: z.number().optional(), // Legacy alias
});

export type AgentRunsDeleteResponse = BatchDeleteResponse & { deleted?: number };

export const agentRunDeleteResponseSchema = z.object({
  deleted: z.boolean(),
});

export type AgentRunDeleteResponseDto = z.infer<typeof agentRunDeleteResponseSchema>;
export type AgentRunDeleteResponse = AgentRunDeleteResponseDto;

export const agentBrowserSnapshotRecordSchema = dtoBaseSchema.extend({
  runId: z.string(),
  url: z.string(),
  title: z.string().nullable().optional(),
  domHtml: z.string(),
  domText: z.string(),
  screenshotData: z.string().nullable().optional(),
  screenshotPath: z.string().nullable().optional(),
  stepId: z.string().nullable().optional(),
  mouseX: z.number().nullable().optional(),
  mouseY: z.number().nullable().optional(),
  viewportWidth: z.number().nullable().optional(),
  viewportHeight: z.number().nullable().optional(),
});

export type AgentBrowserSnapshotRecordDto = z.infer<typeof agentBrowserSnapshotRecordSchema>;
export type AgentBrowserSnapshotRecord = AgentBrowserSnapshotRecordDto;

export const agentBrowserSnapshotsResponseSchema = z.object({
  snapshots: z.array(agentBrowserSnapshotRecordSchema),
});

export type AgentBrowserSnapshotsResponseDto = z.infer<
  typeof agentBrowserSnapshotsResponseSchema
>;
export type AgentBrowserSnapshotsResponse = AgentBrowserSnapshotsResponseDto;

export const agentBrowserLogRecordSchema = dtoBaseSchema.extend({
  runId: z.string(),
  stepId: z.string().nullable().optional(),
  level: z.string(),
  message: z.string(),
  metadata: z.unknown().nullable().optional(),
});

export type AgentBrowserLogRecordDto = z.infer<typeof agentBrowserLogRecordSchema>;
export type AgentBrowserLogRecord = AgentBrowserLogRecordDto;

export const agentBrowserLogsResponseSchema = z.object({
  logs: z.array(agentBrowserLogRecordSchema),
});

export type AgentBrowserLogsResponseDto = z.infer<typeof agentBrowserLogsResponseSchema>;
export type AgentBrowserLogsResponse = AgentBrowserLogsResponseDto;

export const agentAuditLogRecordSchema = dtoBaseSchema.extend({
  runId: z.string().nullable(),
  level: z.string(),
  message: z.string(),
  metadata: z.unknown(),
});

export type AgentAuditLogRecordDto = z.infer<typeof agentAuditLogRecordSchema>;

export const agentAuditLogRecordsResponseSchema = z.object({
  audits: z.array(agentAuditLogRecordSchema),
});

export type AgentAuditLogRecordsResponseDto = z.infer<typeof agentAuditLogRecordsResponseSchema>;
export type AgentAuditLogRecordsResponse = AgentAuditLogRecordsResponseDto;

export interface AgentAuditLogRecordDtoBase {
  id: string;
  runId: string | null;
  level: string;
  message: string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string | null;
}

export type AgentAuditLogRecord = Omit<AgentAuditLogRecordDtoBase, 'createdAt'> & {
  createdAt: Date;
};

export const uiElementSchema = z.object({
  tag: z.string(),
  id: z.string().nullable(),
  name: z.string().nullable(),
  type: z.string().nullable(),
  text: z.string().nullable(),
  placeholder: z.string().nullable(),
  ariaLabel: z.string().nullable(),
  role: z.string().nullable(),
  selector: z.string().nullable(),
  href: z.string().optional(),
  action: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
});

export type UiElementDto = z.infer<typeof uiElementSchema>;
export type UiElement = UiElementDto;

export const uiInventorySchema = z.object({
  url: z.string(),
  title: z.string(),
  counts: z.object({
    inputs: z.number(),
    buttons: z.number(),
    links: z.number(),
    headings: z.number(),
    forms: z.number(),
  }),
  inputs: z.array(uiElementSchema),
  buttons: z.array(uiElementSchema),
  links: z.array(uiElementSchema),
  headings: z.array(uiElementSchema),
  forms: z.array(uiElementSchema),
  truncated: z.object({
    inputs: z.boolean(),
    buttons: z.boolean(),
    links: z.boolean(),
    headings: z.boolean(),
    forms: z.boolean(),
  }),
});

export type UiInventoryDto = z.infer<typeof uiInventorySchema>;
export type UiInventory = UiInventoryDto;

export const agentExecutionContextSchema = z.object({
  run: z.object({
    id: z.string(),
    prompt: z.string(),
    agentBrowser: z.string().nullable().optional(),
    runHeadless: z.boolean().nullable().optional(),
  }),
  memoryKey: z.string().nullable(),
  memoryContext: z.array(z.string()),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.nullable().optional(),
  contextRegistryPrompt: z.string().nullable().optional(),
  settings: agentPlanSettingsSchema,
  preferences: agentRuntimeExecutionPreferencesSchema,
  resolvedModel: z.string(),
  memoryValidationModel: z.string().nullable(),
  memorySummarizationModel: z.string(),
  plannerModel: z.string(),
  selfCheckModel: z.string(),
  loopGuardModel: z.string(),
  approvalGateModel: z.string().nullable(),
  browserContext: z
    .object({
      url: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      domTextSample: z.string().optional(),
      logs: z.array(z.object({ level: z.string(), message: z.string() })).optional(),
      uiInventory: z.unknown().optional(),
    })
    .nullable(),
});

export type AgentExecutionContext = z.infer<typeof agentExecutionContextSchema>;

export const adaptivePlanReviewResultSchema = z.object({
  shouldReplan: z.boolean(),
  reason: z.string().optional(),
  steps: z.array(planStepSchema),
  hierarchy: planHierarchySchema.nullable().optional(),
  meta: plannerMetaSchema.nullable().optional(),
});

export type AdaptivePlanReviewResult = z.infer<typeof adaptivePlanReviewResultSchema>;

export const selfCheckReviewResultSchema = z.object({
  action: z.enum(['continue', 'replan', 'wait_human']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  questions: z.array(z.string()).optional(),
  evidence: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  missingInfo: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  hypotheses: z.array(z.string()).optional(),
  verificationSteps: z.array(z.string()).optional(),
  toolSwitch: z.string().optional(),
  abortSignals: z.array(z.string()).optional(),
  finishSignals: z.array(z.string()).optional(),
  steps: z.array(planStepSchema),
  hierarchy: planHierarchySchema.nullable().optional(),
  meta: plannerMetaSchema.nullable().optional(),
});

export type SelfCheckReviewResult = z.infer<typeof selfCheckReviewResultSchema>;

export const agentVerificationSchema = z.object({
  verdict: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional(),
  followUp: z.string().nullable().optional(),
});

export type AgentVerification = z.infer<typeof agentVerificationSchema>;
