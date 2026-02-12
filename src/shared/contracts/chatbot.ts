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
  title: z.string(),
  userId: z.string().nullable(),
  messages: z.array(chatMessageSchema),
  messageCount: z.number(),
  settings: chatbotSessionSettingsSchema.optional(),
});

export type ChatbotSessionDto = z.infer<typeof chatbotSessionSchema>;

export const createChatSessionSchema = chatbotSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatSessionDto = z.infer<typeof createChatSessionSchema>;
export type UpdateChatSessionDto = Partial<CreateChatSessionDto>;

/**
 * Chatbot Memory Item Contract
 */
export const chatbotMemoryItemSchema = dtoBaseSchema.extend({
  key: z.string(),
  value: z.string(),
  type: z.string(),
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
export const chatbotContextSegmentSchema = dtoBaseSchema.extend({
  content: z.string(),
  type: z.string(),
  priority: z.number(),
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
