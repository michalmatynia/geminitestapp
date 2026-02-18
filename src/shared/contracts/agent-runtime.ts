import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Agent Runtime DTOs
 */

export const agentDecisionSchema = z.object({
  action: z.enum(['respond', 'tool', 'wait_human']),
  reason: z.string(),
  toolName: z.string().optional(),
});

export type AgentDecisionDto = z.infer<typeof agentDecisionSchema>;

export const planStepStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type PlanStepStatusDto = z.infer<typeof planStepStatusSchema>;

export const planStepPhaseSchema = z.enum(['observe', 'act', 'verify', 'recover']);
export type PlanStepPhaseDto = z.infer<typeof planStepPhaseSchema>;

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

export type PlanStepDto = z.infer<typeof planStepSchema>;

export const plannerCritiqueSchema = z.object({
  assumptions: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  unknowns: z.array(z.string()).optional(),
  safetyChecks: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
});

export type PlannerCritiqueDto = z.infer<typeof plannerCritiqueSchema>;

export const plannerAlternativeSchema = z.object({
  title: z.string(),
  rationale: z.string().nullable().optional(),
  steps: z.array(z.object({
    title: z.string().optional(),
    tool: z.string().optional(),
    expectedObservation: z.string().optional(),
    successCriteria: z.string().optional(),
    phase: z.string().optional(),
    priority: z.number().optional(),
    dependsOn: z.union([z.array(z.number()), z.array(z.string())]).optional(),
  })),
});

export type PlannerAlternativeDto = z.infer<typeof plannerAlternativeSchema>;

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

export type PlannerMetaDto = z.infer<typeof plannerMetaSchema>;

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

export type AgentPlanSettingsDto = z.infer<typeof agentPlanSettingsSchema>;

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

export type AgentPlanPreferencesDto = z.infer<typeof agentPlanPreferencesSchema>;

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
  updatedAt: z.string(),
});

export type AgentCheckpointDto = z.infer<typeof agentCheckpointSchema>;

export const loopSignalSchema = z.object({
  reason: z.string(),
  pattern: z.string(),
  titles: z.array(z.string()),
  urls: z.array(z.string().nullable()),
  statuses: z.array(planStepStatusSchema),
});

export type LoopSignalDto = z.infer<typeof loopSignalSchema>;

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

export type ApprovalRequestDto = z.infer<typeof approvalRequestSchema>;

export const planHierarchySchema = z.object({
  goals: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    subgoals: z.array(z.string()),
  })),
  subgoals: z.array(z.object({
    id: z.string(),
    title: z.string(),
    steps: z.array(z.string()),
  })),
});

export type PlanHierarchyDto = z.infer<typeof planHierarchySchema>;

export const agentToolRequestSchema = z.object({
  tool: z.string(),
  input: z.unknown(),
  runId: z.string(),
  stepId: z.string(),
});

export type AgentToolRequestDto = z.infer<typeof agentToolRequestSchema>;

export const agentToolResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  observation: z.string().optional(),
});

export type AgentToolResultDto = z.infer<typeof agentToolResultSchema>;

export const agentRunStatusTypeSchema = z.enum(['queued', 'running', 'waiting_human', 'stopped', 'failed', 'completed']);
export type AgentRunStatusTypeDto = z.infer<typeof agentRunStatusTypeSchema>;

export const agentAuditLogRecordSchema = dtoBaseSchema.extend({
  runId: z.string().nullable(),
  level: z.string(),
  message: z.string(),
  metadata: z.unknown(),
});

export type AgentAuditLogRecordDto = z.infer<typeof agentAuditLogRecordSchema>;

export const agentExecutionContextSchema = z.object({
  run: z.object({
    id: z.string(),
    prompt: z.string(),
    agentBrowser: z.string().nullable().optional(),
    runHeadless: z.boolean().nullable().optional(),
  }),
  memoryKey: z.string().nullable(),
  memoryContext: z.array(z.string()),
  settings: agentPlanSettingsSchema,
  preferences: agentPlanPreferencesSchema,
  resolvedModel: z.string(),
  memoryValidationModel: z.string().nullable(),
  memorySummarizationModel: z.string(),
  plannerModel: z.string(),
  selfCheckModel: z.string(),
  loopGuardModel: z.string(),
  approvalGateModel: z.string().nullable(),
  browserContext: z.object({
    url: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    domTextSample: z.string().optional(),
    logs: z.array(z.object({ level: z.string(), message: z.string() })).optional(),
    uiInventory: z.unknown().optional(),
  }).nullable(),
});

export type AgentExecutionContextDto = z.infer<typeof agentExecutionContextSchema>;
