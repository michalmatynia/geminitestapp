import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Chat Message Contract
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  images: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;

/**
 * Chat Session Contract
 */
export const chatbotSessionSettingsSchema = z.object({
  model: z.string().optional(),
  webSearchEnabled: z.boolean().optional(),
  useGlobalContext: z.boolean().optional(),
  useLocalContext: z.boolean().optional(),
});

export type ChatbotSessionSettingsDto = z.infer<typeof chatbotSessionSettingsSchema>;

export const chatbotSessionSchema = dtoBaseSchema.extend({
  title: z.string().nullable(),
  userId: z.string().nullable(),
  messages: z.array(chatMessageSchema),
  messageCount: z.number(),
  settings: chatbotSessionSettingsSchema.optional(),
});

export type ChatbotSessionDto = z.infer<typeof chatbotSessionSchema>;

export const chatbotSessionListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatbotSessionListItemDto = z.infer<typeof chatbotSessionListItemSchema>;

export const createChatSessionSchema = chatbotSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatSessionDto = z.infer<typeof createChatSessionSchema>;
export type ChatSessionCreateInput = CreateChatSessionDto;
export type UpdateChatSessionDto = Partial<CreateChatSessionDto>;
export type ChatSessionUpdateInput = UpdateChatSessionDto;

/**
 * Chatbot Memory Item Contract
 */
export const chatbotMemoryItemSchema = dtoBaseSchema.extend({
  memoryKey: z.string(),
  runId: z.string().nullable(),
  content: z.string(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  importance: z.number().nullable(),
  lastAccessedAt: z.string().nullable(),
});

export type ChatbotMemoryItemDto = z.infer<typeof chatbotMemoryItemSchema>;

export const createChatbotMemoryItemSchema = chatbotMemoryItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatbotMemoryItemDto = z.infer<typeof createChatbotMemoryItemSchema>;
export type UpdateChatbotMemoryItemDto = Partial<CreateChatbotMemoryItemDto>;

/**
 * Agent Audit Log Contract
 */
export const agentAuditLogSchema = dtoBaseSchema.extend({
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  level: z.enum(['info', 'warning', 'error']),
});

export type AgentAuditLogDto = z.infer<typeof agentAuditLogSchema>;

/**
 * Agent Browser Log Contract
 */
export const agentBrowserLogSchema = dtoBaseSchema.extend({
  level: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AgentBrowserLogDto = z.infer<typeof agentBrowserLogSchema>;

/**
 * Chatbot Context Segment Contract
 */
export const chatbotContextSegmentSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type ChatbotContextSegmentDto = z.infer<typeof chatbotContextSegmentSchema>;

/**
 * Chatbot Global Settings Contract
 */
export const chatbotSettingsSchema = dtoBaseSchema.extend({
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  systemPrompt: z.string(),
  enableMemory: z.boolean(),
  enableContext: z.boolean(),
  webSearchEnabled: z.boolean(),
  useGlobalContext: z.boolean(),
  useLocalContext: z.boolean(),
  localContextMode: z.enum(['override', 'append']),
  searchProvider: z.string(),
  playwrightPersonaId: z.string().nullable().optional(),
  agentModeEnabled: z.boolean(),
  agentBrowser: z.string(),
  runHeadless: z.boolean(),
  ignoreRobotsTxt: z.boolean(),
  requireHumanApproval: z.boolean(),
  memoryValidationModel: z.string().nullable(),
  plannerModel: z.string().nullable(),
  selfCheckModel: z.string().nullable(),
  extractionValidationModel: z.string().nullable(),
  toolRouterModel: z.string().nullable(),
  loopGuardModel: z.string().nullable(),
  approvalGateModel: z.string().nullable(),
  memorySummarizationModel: z.string().nullable(),
  selectorInferenceModel: z.string().nullable(),
  outputNormalizationModel: z.string().nullable(),
  maxSteps: z.number(),
  maxStepAttempts: z.number(),
  maxReplanCalls: z.number(),
  replanEverySteps: z.number(),
  maxSelfChecks: z.number(),
  loopGuardThreshold: z.number(),
  loopBackoffBaseMs: z.number(),
  loopBackoffMaxMs: z.number(),
});

export type ChatbotSettingsDto = z.infer<typeof chatbotSettingsSchema>;

export const chatbotSettingsRecordSchema = dtoBaseSchema.extend({
  key: z.string(),
  settings: z.record(z.string(), z.unknown()),
});

export type ChatbotSettingsRecordDto = z.infer<typeof chatbotSettingsRecordSchema>;

export const createChatbotSettingsSchema = chatbotSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatbotSettingsDto = z.infer<typeof createChatbotSettingsSchema>;
export type UpdateChatbotSettingsDto = Partial<CreateChatbotSettingsDto>;

/**
 * Message Sending Contract
 */
export const sendMessageSchema = z.object({
  sessionId: z.string(),
  content: z.string(),
  role: z.enum(['user', 'system']).optional(),
  images: z.array(z.string()).optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

/**
 * Debug State Contract
 */
export const chatbotDebugStateSchema = z.object({
  lastRequest: z.record(z.string(), z.unknown()).optional(),
  lastResponse: z.object({
    ok: z.boolean(),
    durationMs: z.number(),
    error: z.string().optional(),
    errorId: z.string().optional(),
  }).optional(),
});

export type ChatbotDebugStateDto = z.infer<typeof chatbotDebugStateSchema>;

/**
 * Job Processing Contracts
 */
export const chatbotJobPayloadSchema = z.object({
  messages: z.array(chatMessageSchema),
  model: z.string(),
});

export type ChatbotJobPayloadDto = z.infer<typeof chatbotJobPayloadSchema>;

export const enqueueChatbotJobRequestSchema = z.object({
  sessionId: z.string(),
  model: z.string(),
  messages: z.array(chatMessageSchema),
  userMessage: z.string().optional(),
});

export type EnqueueChatbotJobRequestDto = z.infer<typeof enqueueChatbotJobRequestSchema>;

export const chatbotJobSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  status: z.string(), // Use generic string for status to avoid circular dependency
  model: z.string().optional(),
  payload: chatbotJobPayloadSchema,
  resultText: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type ChatbotJobDto = z.infer<typeof chatbotJobSchema>;

/**
 * Agent Execution Contracts
 */
export const agentSnapshotSchema = dtoBaseSchema.extend({
  url: z.string(),
  title: z.string().nullable(),
  domText: z.string(),
  domHtml: z.string().nullable().optional(),
  screenshotUrl: z.string().nullable().optional(),
  screenshotData: z.string().nullable().optional(),
  screenshotPath: z.string().nullable().optional(),
  stepId: z.string().nullable().optional(),
  mouseX: z.number().nullable(),
  mouseY: z.number().nullable(),
  viewportWidth: z.number().nullable(),
  viewportHeight: z.number().nullable(),
});

export type AgentSnapshotDto = z.infer<typeof agentSnapshotSchema>;

export const agentPlanStepSchema = dtoBaseSchema.extend({
  title: z.string(),
  status: z.string(), // Generic status
  snapshotId: z.string().nullable().optional(),
  logCount: z.number().nullable().optional(),
  dependsOn: z.array(z.string()).nullable().optional(),
  phase: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
});

export type AgentPlanStepDto = z.infer<typeof agentPlanStepSchema>;

/**
 * Agent Planning DTOs
 */
export const agentStepSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  tool: z.string().nullable().optional(),
  successCriteria: z.string().nullable().optional(),
  expectedObservation: z.string().nullable().optional(),
  status: z.string().optional(),
  phase: z.string().nullable().optional(),
});

export type AgentStepDto = z.infer<typeof agentStepSchema>;

export const agentSubgoalSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  successCriteria: z.string().nullable().optional(),
  steps: z.array(agentStepSchema).optional(),
});

export type AgentSubgoalDto = z.infer<typeof agentSubgoalSchema>;

export const agentGoalSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  successCriteria: z.string().nullable().optional(),
  subgoals: z.array(agentSubgoalSchema).optional(),
});

export type AgentGoalDto = z.infer<typeof agentGoalSchema>;

export const agentPlanHierarchySchema = z.object({
  goals: z.array(agentGoalSchema).optional(),
});

export type AgentPlanHierarchyDto = z.infer<typeof agentPlanHierarchySchema>;

export const agentPlanningMetaSchema = z.object({
  type: z.string().optional(),
  stepId: z.string().optional(),
  failedStepId: z.string().optional(),
  activeStepId: z.string().optional(),
  reason: z.string().optional(),
  branchSteps: z.array(agentStepSchema).optional(),
  steps: z.array(agentStepSchema).optional(),
  hierarchy: agentPlanHierarchySchema.optional(),
  items: z.array(z.unknown()).optional(),
  names: z.array(z.unknown()).optional(),
  url: z.string().optional(),
  extractionType: z.string().optional(),
  summary: z.string().optional(),
});

export type AgentPlanningMetaDto = z.infer<typeof agentPlanningMetaSchema>;

/**
 * Agent Session Context DTOs
 */
export const agentSessionContextSchema = z.object({
  cookies: z.array(z.object({
    name: z.string(),
    domain: z.string(),
    valueLength: z.number(),
  })).optional(),
  storage: z.object({
    localCount: z.number(),
    sessionCount: z.number(),
    localKeys: z.array(z.string()).optional(),
  }).optional(),
});

export type AgentSessionContextDto = z.infer<typeof agentSessionContextSchema>;

export const agentLoginCandidatesSchema = z.object({
  inputs: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    score: z.number(),
  })).optional(),
  buttons: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    text: z.string().optional(),
    score: z.number(),
  })).optional(),
});

export type AgentLoginCandidatesDto = z.infer<typeof agentLoginCandidatesSchema>;

/**
 * Timeline DTO
 */
export const chatbotTimelineEntrySchema = z.object({
  id: z.string(),
  source: z.enum(['audit', 'browser']),
  level: z.string().nullable().optional(),
  message: z.string(),
  createdAt: z.string(),
});

export type ChatbotTimelineEntryDto = z.infer<typeof chatbotTimelineEntrySchema>;

/**
 * Agent Settings Payload DTO
 */

export const agentSettingsPayloadSchema = z.object({
  agentBrowser: z.string(),
  runHeadless: z.boolean(),
  ignoreRobotsTxt: z.boolean(),
  requireHumanApproval: z.boolean(),
  memoryValidationModel: z.string(),
  plannerModel: z.string(),
  selfCheckModel: z.string(),
  extractionValidationModel: z.string(),
  toolRouterModel: z.string(),
  loopGuardModel: z.string(),
  approvalGateModel: z.string(),
  memorySummarizationModel: z.string(),
  selectorInferenceModel: z.string(),
  outputNormalizationModel: z.string(),
  maxSteps: z.number(),
  maxStepAttempts: z.number(),
  maxReplanCalls: z.number(),
  replanEverySteps: z.number(),
  maxSelfChecks: z.number(),
  loopGuardThreshold: z.number(),
  loopBackoffBaseMs: z.number(),
  loopBackoffMaxMs: z.number(),
});

export type AgentSettingsPayloadDto = z.infer<typeof agentSettingsPayloadSchema>;

/**
 * Model Profile DTOs
 */
export const modelProfileSchema = z.object({
  name: z.string(),
  normalized: z.string(),
  size: z.number().nullable(),
  isEmbedding: z.boolean(),
  isRerank: z.boolean(),
  isVision: z.boolean(),
  isCode: z.boolean(),
  isInstruct: z.boolean(),
  isChat: z.boolean(),
  isReasoning: z.boolean(),
});

export type ModelProfileDto = z.infer<typeof modelProfileSchema>;

export const modelTaskRuleSchema = z.object({
  targetSize: z.number().optional(),
  preferLarge: z.boolean().optional(),
  preferSmall: z.boolean().optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
  preferReasoning: z.boolean().optional(),
});

export type ModelTaskRuleDto = z.infer<typeof modelTaskRuleSchema>;
