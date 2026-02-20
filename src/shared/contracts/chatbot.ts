import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Chatbot Settings & Config
 */
export const chatbotSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultModelId: z.string(),
  welcomeMessage: z.string(),
  systemPrompt: z.string(),
  personaId: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  topP: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
  visionEnabled: z.boolean().optional(),
  toolsEnabled: z.boolean().optional(),
  allowedTools: z.array(z.string()).optional(),
  memoryEnabled: z.boolean().optional(),
  memoryWindow: z.number().optional(),
  humanInterventionRequired: z.boolean().optional(),
});

export type ChatbotSettingsDto = z.infer<typeof chatbotSettingsSchema>;

export const createChatbotSettingsSchema = chatbotSettingsSchema.partial();
export type CreateChatbotSettingsDto = z.infer<typeof createChatbotSettingsSchema>;
export type ChatbotSettingsPayload = CreateChatbotSettingsDto;

/**
 * Chat Message Contract
 */
export const chatMessageRoleSchema = z.enum([
  'system',
  'user',
  'assistant',
  'tool',
  'error',
  'info',
  'audit',
]);

export type ChatMessageRoleDto = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: chatMessageRoleSchema,
  content: z.string(),
  timestamp: z.string(),
  model: z.string().optional(),
  toolCalls: z.array(z.record(z.string(), z.unknown())).optional(),
  toolResults: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;
export type ChatMessage = ChatMessageDto;

/**
 * Chat Session Contract
 */
export const chatSessionSchema = dtoBaseSchema.extend({
  title: z.string().nullable(),
  userId: z.string().nullable(),
  settings: chatbotSettingsSchema.optional(),
  lastMessageAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotSessionDto = z.infer<typeof chatSessionSchema>;
export type ChatSession = ChatbotSessionDto;

export const createChatSessionSchema = chatSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatSessionDto = z.infer<typeof createChatSessionSchema>;
export type CreateSessionInput = CreateChatSessionDto;

export const updateChatSessionSchema = createChatSessionSchema.partial();

export type UpdateChatSessionDto = z.infer<typeof updateChatSessionSchema>;
export type UpdateSessionInput = UpdateChatSessionDto;

/**
 * Chatbot Job Contract
 */
export const chatbotJobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'canceled',
]);

export type ChatbotJobStatusDto = z.infer<typeof chatbotJobStatusSchema>;

export const chatbotJobPayloadSchema = z.object({
  sessionId: z.string(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotJobPayloadDto = z.infer<typeof chatbotJobPayloadSchema>;
export type ChatbotJobPayload = ChatbotJobPayloadDto;

export const chatbotJobSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  status: chatbotJobStatusSchema,
  model: z.string().nullable().optional(),
  payload: chatbotJobPayloadSchema,
  resultText: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type ChatbotJobDto = z.infer<typeof chatbotJobSchema>;
export type ChatbotJob = ChatbotJobDto;

/**
 * Chatbot Memory Contract
 */
export const chatbotMemoryItemSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  key: z.string(),
  value: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotMemoryItemDto = z.infer<typeof chatbotMemoryItemSchema>;
export type ChatbotMemoryItem = ChatbotMemoryItemDto;

export const createChatbotMemoryItemSchema = chatbotMemoryItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatbotMemoryItemDto = z.infer<typeof createChatbotMemoryItemSchema>;

export const updateChatbotMemoryItemSchema = createChatbotMemoryItemSchema.partial();

export type UpdateChatbotMemoryItemDto = z.infer<typeof updateChatbotMemoryItemSchema>;

/**
 * Agent Runtime Snapshot Contract
 */
export const agentGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'failed']),
  priority: z.number().optional(),
});

export type AgentGoalDto = z.infer<typeof agentGoalSchema>;
export type AgentGoal = AgentGoalDto;

export const agentSubgoalSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string(),
  status: z.enum(['pending', 'active', 'completed', 'failed']),
});

export type AgentSubgoalDto = z.infer<typeof agentSubgoalSchema>;
export type AgentSubgoal = AgentSubgoalDto;

export const agentStepSchema = z.object({
  id: z.string(),
  subgoalId: z.string().optional(),
  title: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  action: z.string().optional(),
  result: z.string().optional(),
  durationMs: z.number().optional(),
});

export type AgentStepDto = z.infer<typeof agentStepSchema>;
export type AgentStep = AgentStepDto;

export const agentPlanHierarchySchema = z.object({
  goals: z.array(agentGoalSchema),
  subgoals: z.array(agentSubgoalSchema),
  steps: z.array(agentStepSchema),
});

export type AgentPlanHierarchyDto = z.infer<typeof agentPlanHierarchySchema>;
export type AgentPlanHierarchy = AgentPlanHierarchyDto;

export const agentSnapshotSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  requestId: z.string().nullable().optional(),
  plan: agentPlanHierarchySchema,
  activeGoalId: z.string().nullable().optional(),
  activeSubgoalId: z.string().nullable().optional(),
  activeStepId: z.string().nullable().optional(),
  thoughtProcess: z.array(z.string()).optional(),
  screenshotUrl: z.string().nullable().optional(),
  browserUrl: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AgentSnapshotDto = z.infer<typeof agentSnapshotSchema>;
export type AgentSnapshot = AgentSnapshotDto;

/**
 * Agent Audit & Browser Log Contract
 */
export const agentAuditLogSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  requestId: z.string().nullable().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentAuditLogDto = z.infer<typeof agentAuditLogSchema>;
export type AgentAuditLog = AgentAuditLogDto;

export const agentBrowserLogSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  requestId: z.string().nullable().optional(),
  type: z.enum(['console', 'network', 'navigation']),
  level: z.string().optional(),
  message: z.string(),
  url: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  status: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentBrowserLogDto = z.infer<typeof agentBrowserLogSchema>;
export type AgentBrowserLog = AgentBrowserLogDto;

/**
 * Chatbot UI & Analytics DTOs
 */
export const chatbotTimelineEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['message', 'snapshot', 'job', 'log']),
  timestamp: z.string(),
  level: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  ref: z.string().optional(),
});

export type ChatbotTimelineEntryDto = z.infer<typeof chatbotTimelineEntrySchema>;
export type TimelineEntry = ChatbotTimelineEntryDto;

export const chatbotDebugStateSchema = z.object({
  activeRunId: z.string().nullable(),
  isPaused: z.boolean(),
  stepMode: z.boolean(),
  lastUpdateAt: z.string(),
});

export type ChatbotDebugStateDto = z.infer<typeof chatbotDebugStateSchema>;
export type ChatbotDebugState = ChatbotDebugStateDto;

/**
 * Model & Task Config DTOs
 */
export const modelProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  capabilities: z.array(z.string()),
  contextWindow: z.number(),
  maxOutputTokens: z.number(),
});

export type ModelProfileDto = z.infer<typeof modelProfileSchema>;
export type ModelProfile = ModelProfileDto;

export const modelTaskRuleSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  rule: z.string(),
  priority: z.number(),
  enabled: z.boolean(),
});

export type ModelTaskRuleDto = z.infer<typeof modelTaskRuleSchema>;
export type ModelTaskRule = ModelTaskRuleDto;

export const agentSettingsPayloadSchema = z.object({
  personaId: z.string().optional(),
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
});

export type AgentSettingsPayloadDto = z.infer<typeof agentSettingsPayloadSchema>;
export type AgentSettingsPayload = AgentSettingsPayloadDto;

/**
 * Legacy support / Additional types
 */
export interface ChatSessionDocument {
  _id: any; // mongodb.ObjectId
  title: string | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession['settings'];
}

export interface ChatbotJobDocument {
  _id: any; // mongodb.ObjectId
  sessionId: string;
  status: string;
  model?: string | undefined;
  payload: ChatbotJobPayload;
  resultText?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: Date;
  updatedAt?: Date | null | undefined;
  startedAt?: Date | undefined;
  finishedAt?: Date | undefined;
}

export type AgentPlanStepDto = z.any(); // To avoid error if referenced
export type AgentPlanStep = AgentPlanStepDto;

export type AgentPlanningMetaDto = z.any();
export type AgentPlanningMeta = AgentPlanningMetaDto;

export type AgentSessionContextDto = z.any();
export type AgentSessionContext = AgentSessionContextDto;

export type AgentLoginCandidatesDto = z.any();
export type AgentLoginCandidates = AgentLoginCandidatesDto;
