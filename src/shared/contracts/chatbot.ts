import { z } from 'zod';

import {
  optionalBooleanQuerySchema,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

import { agentPersonaMoodIdSchema } from './agents';
import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { dtoBaseSchema } from './base';

/**
 * Chatbot Settings & Config
 */
export const chatbotSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  model: z.string().optional(),
  defaultModelId: z.string().optional(),
  welcomeMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
  personaId: z.string().nullable().optional(),
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
  enableMemory: z.boolean().optional(),
  enableContext: z.boolean().optional(),
  webSearchEnabled: z.boolean().optional(),
  useGlobalContext: z.boolean().optional(),
  useLocalContext: z.boolean().optional(),
  localContextMode: z.string().optional(),
  searchProvider: z.string().optional(),
  playwrightPersonaId: z.string().nullable().optional(),
  agentModeEnabled: z.boolean().optional(),
  agentBrowser: z.string().optional(),
  runHeadless: z.boolean().optional(),
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
  maxSteps: z.number().optional(),
  maxStepAttempts: z.number().optional(),
  maxReplanCalls: z.number().optional(),
  replanEverySteps: z.number().optional(),
  maxSelfChecks: z.number().optional(),
  loopGuardThreshold: z.number().optional(),
  loopBackoffBaseMs: z.number().optional(),
  loopBackoffMaxMs: z.number().optional(),
});

export type ChatbotSettingsDto = z.infer<typeof chatbotSettingsSchema>;
export type ChatbotSettingsRecordDto = ChatbotSettingsDto;

export const createChatbotSettingsSchema = chatbotSettingsSchema.partial();
export type CreateChatbotSettingsDto = z.infer<typeof createChatbotSettingsSchema>;
export type ChatbotSettingsPayload = CreateChatbotSettingsDto;
export type UpdateChatbotSettingsDto = ChatbotSettingsPayload;

export const chatbotStoredSettingsSchema = dtoBaseSchema.extend({
  key: z.string(),
  settings: chatbotSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatbotStoredSettingsDto = z.infer<typeof chatbotStoredSettingsSchema>;
export type ChatbotStoredSettings = ChatbotStoredSettingsDto;

export const chatbotSettingsResponseSchema = z.object({
  settings: chatbotStoredSettingsSchema.nullable(),
});

export type ChatbotSettingsResponseDto = z.infer<typeof chatbotSettingsResponseSchema>;
export type ChatbotSettingsResponse = ChatbotSettingsResponseDto;

export const chatbotSettingsSaveResponseSchema = z.object({
  settings: chatbotStoredSettingsSchema,
});

export type ChatbotSettingsSaveResponseDto = z.infer<typeof chatbotSettingsSaveResponseSchema>;
export type ChatbotSettingsSaveResponse = ChatbotSettingsSaveResponseDto;

export const chatbotSettingsQuerySchema = z.object({
  key: optionalTrimmedQueryString(),
});

export type ChatbotSettingsQueryDto = z.infer<typeof chatbotSettingsQuerySchema>;

export const chatbotSettingsSaveRequestSchema = z.object({
  key: z.string().trim().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotSettingsSaveRequestDto = z.infer<typeof chatbotSettingsSaveRequestSchema>;

const UNSUPPORTED_CHATBOT_AGENT_MODEL_KEYS = [
  'memoryValidationModel',
  'plannerModel',
  'selfCheckModel',
  'extractionValidationModel',
  'toolRouterModel',
  'loopGuardModel',
  'approvalGateModel',
  'memorySummarizationModel',
  'selectorInferenceModel',
  'outputNormalizationModel',
] as const;

export class ChatbotSettingsValidationError extends Error {
  code: 'invalid_shape';

  constructor(args: { code: 'invalid_shape'; message: string }) {
    super(args.message);
    this.name = 'ChatbotSettingsValidationError';
    this.code = args.code;
  }
}

export const parseChatbotSettingsPayload = (input: unknown): ChatbotSettingsPayload => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: 'Chatbot settings payload must be a JSON object.',
    });
  }

  const record = input as Record<string, unknown>;
  const unsupportedKeys = UNSUPPORTED_CHATBOT_AGENT_MODEL_KEYS.filter(
    (key: string): boolean => key in record
  );
  if (unsupportedKeys.length > 0) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: `Chatbot settings payload includes unsupported keys: ${unsupportedKeys.join(', ')}.`,
    });
  }

  const parsed = chatbotSettingsSchema.strict().safeParse(record);
  if (!parsed.success) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: 'Chatbot settings failed validation.',
    });
  }

  return parsed.data;
};

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
  images: z.array(z.string()).optional(),
  toolCalls: z.array(z.record(z.string(), z.unknown())).optional(),
  toolResults: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;
export type ChatMessage = ChatMessageDto;

export interface SimpleChatMessage<
  TContent = string,
  TRole extends string = 'user' | 'assistant' | 'system' | string,
> {
  role: TRole;
  content: TContent;
}

/**
 * Chat Session Contract
 */
export const chatSessionSchema = dtoBaseSchema.extend({
  title: z.string().nullable(),
  userId: z.string().nullable(),
  personaId: z.string().nullable().optional(),
  settings: chatbotSettingsSchema.optional(),
  lastMessageAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  messages: z.array(chatMessageSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotSessionDto = z.infer<typeof chatSessionSchema>;
export type ChatSession = ChatbotSessionDto;

export const chatbotSessionListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  personaId: z.string().nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type ChatbotSessionListItemDto = z.infer<typeof chatbotSessionListItemSchema>;
export type ChatbotSessionListItem = ChatbotSessionListItemDto;

export const chatbotSessionsQuerySchema = z.object({
  scope: z.enum(['list', 'ids']).optional(),
  query: z.string().trim().optional(),
});

export type ChatbotSessionsQueryDto = z.infer<typeof chatbotSessionsQuerySchema>;
export type ChatbotSessionsQuery = ChatbotSessionsQueryDto;

export const chatbotSessionsResponseSchema = z.object({
  sessions: z.array(chatSessionSchema).optional(),
});

export type ChatbotSessionsResponseDto = z.infer<typeof chatbotSessionsResponseSchema>;
export type ChatbotSessionsResponse = ChatbotSessionsResponseDto;

export const chatbotSessionIdsResponseSchema = z.object({
  ids: z.array(z.string()),
});

export type ChatbotSessionIdsResponseDto = z.infer<typeof chatbotSessionIdsResponseSchema>;
export type ChatbotSessionIdsResponse = ChatbotSessionIdsResponseDto;

export const chatbotSessionResponseSchema = z.object({
  session: chatSessionSchema,
});

export type ChatbotSessionResponseDto = z.infer<typeof chatbotSessionResponseSchema>;
export type ChatbotSessionResponse = ChatbotSessionResponseDto;

export const chatbotSessionCreateRequestSchema = z.object({
  title: z.string().trim().optional(),
  settings: chatbotSettingsSchema.optional(),
});

export type ChatbotSessionCreateRequestDto = z.infer<typeof chatbotSessionCreateRequestSchema>;
export type ChatbotSessionCreateRequest = ChatbotSessionCreateRequestDto;

export const chatbotSessionCreateResponseSchema = z.object({
  sessionId: z.string(),
  session: chatSessionSchema.optional(),
});

export type ChatbotSessionCreateResponseDto = z.infer<typeof chatbotSessionCreateResponseSchema>;
export type ChatbotSessionCreateResponse = ChatbotSessionCreateResponseDto;

export const chatbotSessionUpdateRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  title: z.string().trim().optional(),
});

export type ChatbotSessionUpdateRequestDto = z.infer<typeof chatbotSessionUpdateRequestSchema>;
export type ChatbotSessionUpdateRequest = ChatbotSessionUpdateRequestDto;

export const chatbotSessionDeleteRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export type ChatbotSessionDeleteRequestDto = z.infer<typeof chatbotSessionDeleteRequestSchema>;
export type ChatbotSessionDeleteRequest = ChatbotSessionDeleteRequestDto;

export const chatbotSessionsDeleteRequestSchema = z.object({
  sessionIds: z.array(z.string().trim().min(1)).min(1),
});

export type ChatbotSessionsDeleteRequestDto = z.infer<typeof chatbotSessionsDeleteRequestSchema>;
export type ChatbotSessionsDeleteRequest = ChatbotSessionsDeleteRequestDto;

export const chatbotSessionsDeleteBodySchema = z.union([
  chatbotSessionDeleteRequestSchema,
  chatbotSessionsDeleteRequestSchema,
]);

export type ChatbotSessionsDeleteBodyDto = z.infer<typeof chatbotSessionsDeleteBodySchema>;
export type ChatbotSessionsDeleteBody = ChatbotSessionsDeleteBodyDto;

export const chatbotSessionDeleteResponseSchema = z.object({
  success: z.literal(true),
  deletedCount: z.number().int().nonnegative().optional(),
});

export type ChatbotSessionDeleteResponseDto = z.infer<typeof chatbotSessionDeleteResponseSchema>;
export type ChatbotSessionDeleteResponse = ChatbotSessionDeleteResponseDto;

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

export const sendMessageSchema = z.object({
  content: z.string(),
  model: z.string().optional(),
  images: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const chatbotSessionMessageCreateRequestSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string().trim().min(1),
});

export type ChatbotSessionMessageCreateRequestDto = z.infer<
  typeof chatbotSessionMessageCreateRequestSchema
>;
export type ChatbotSessionMessageCreateRequest = ChatbotSessionMessageCreateRequestDto;

export const chatbotSessionMessagesResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export type ChatbotSessionMessagesResponseDto = z.infer<
  typeof chatbotSessionMessagesResponseSchema
>;
export type ChatbotSessionMessagesResponse = ChatbotSessionMessagesResponseDto;

export const chatbotSessionMessageResponseSchema = z.object({
  message: chatMessageSchema,
});

export type ChatbotSessionMessageResponseDto = z.infer<
  typeof chatbotSessionMessageResponseSchema
>;
export type ChatbotSessionMessageResponse = ChatbotSessionMessageResponseDto;

export const chatbotChatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string(),
  images: z.array(z.string()).optional(),
});

export type ChatbotChatMessageDto = z.infer<typeof chatbotChatMessageSchema>;
export type ChatbotChatMessage = ChatbotChatMessageDto;

export const chatbotChatRequestSchema = z.object({
  messages: z.array(chatbotChatMessageSchema).min(1),
  sessionId: z.string().nullable().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ChatbotChatRequestDto = z.infer<typeof chatbotChatRequestSchema>;
export type ChatbotChatRequest = ChatbotChatRequestDto;

export const chatbotJsonRequestSchema = z
  .object({
    messages: z.array(chatbotChatMessageSchema).optional(),
    sessionId: chatbotChatRequestSchema.shape.sessionId,
    contextRegistry: chatbotChatRequestSchema.shape.contextRegistry,
    model: z.unknown().optional(),
  })
  .passthrough();

export type ChatbotJsonRequestDto = z.infer<typeof chatbotJsonRequestSchema>;

export const chatbotChatResponseSchema = z.object({
  message: z.string().optional(),
  sessionId: z.string().nullable().optional(),
  suggestedMoodId: agentPersonaMoodIdSchema.nullable().optional(),
  brainApplied: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotChatResponseDto = z.infer<typeof chatbotChatResponseSchema>;

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
  sessionId: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
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

export const enqueueChatbotJobRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  userMessage: z.string().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type EnqueueChatbotJobRequestDto = z.infer<typeof enqueueChatbotJobRequestSchema>;

export const chatbotJobsDeleteQuerySchema = z.object({
  scope: optionalTrimmedQueryString(z.enum(['terminal'])),
});

export type ChatbotJobsDeleteQueryDto = z.infer<typeof chatbotJobsDeleteQuerySchema>;

export const chatbotJobActionRequestSchema = z.object({
  action: z.string().trim().optional(),
});

export type ChatbotJobActionRequestDto = z.infer<typeof chatbotJobActionRequestSchema>;

export const chatbotJobDeleteQuerySchema = z.object({
  force: optionalBooleanQuerySchema(),
});

export type ChatbotJobDeleteQueryDto = z.infer<typeof chatbotJobDeleteQuerySchema>;

export const chatbotJobsResponseSchema = z.object({
  jobs: z.array(chatbotJobSchema),
});

export type ChatbotJobsResponseDto = z.infer<typeof chatbotJobsResponseSchema>;
export type ChatbotJobsResponse = ChatbotJobsResponseDto;

export const chatbotJobResponseSchema = z.object({
  job: chatbotJobSchema,
});

export type ChatbotJobResponseDto = z.infer<typeof chatbotJobResponseSchema>;
export type ChatbotJobResponse = ChatbotJobResponseDto;

export const chatbotJobEnqueueResponseSchema = z.object({
  jobId: z.string(),
  status: chatbotJobStatusSchema,
  brainApplied: z.object({
    modelId: z.string().optional(),
    enforced: z.boolean().optional(),
  }),
});

export type ChatbotJobEnqueueResponseDto = z.infer<typeof chatbotJobEnqueueResponseSchema>;
export type ChatbotJobEnqueueResponse = ChatbotJobEnqueueResponseDto;

export const chatbotJobActionResponseSchema = z.object({
  status: chatbotJobStatusSchema.optional(),
});

export type ChatbotJobActionResponseDto = z.infer<typeof chatbotJobActionResponseSchema>;
export type ChatbotJobActionResponse = ChatbotJobActionResponseDto;

export const chatbotJobsClearResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

export type ChatbotJobsClearResponseDto = z.infer<typeof chatbotJobsClearResponseSchema>;
export type ChatbotJobsClearResponse = ChatbotJobsClearResponseDto;

export const chatbotJobDeleteResponseSchema = z.object({
  deleted: z.literal(true),
});

export type ChatbotJobDeleteResponseDto = z.infer<typeof chatbotJobDeleteResponseSchema>;
export type ChatbotJobDeleteResponse = ChatbotJobDeleteResponseDto;

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

export const chatbotMemoryResponseSchema = z.object({
  items: z.array(chatbotMemoryItemSchema).optional(),
});

export type ChatbotMemoryResponseDto = z.infer<typeof chatbotMemoryResponseSchema>;
export type ChatbotMemoryResponse = ChatbotMemoryResponseDto;

export const chatbotMemoryQuerySchema = z.object({
  memoryKey: optionalTrimmedQueryString(),
  tag: optionalTrimmedQueryString(),
  q: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(100)).default(50),
});

export type ChatbotMemoryQueryDto = z.infer<typeof chatbotMemoryQuerySchema>;

export const createChatbotMemoryItemSchema = chatbotMemoryItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatbotMemoryItemDto = z.infer<typeof createChatbotMemoryItemSchema>;

export const updateChatbotMemoryItemSchema = createChatbotMemoryItemSchema.partial();

export type UpdateChatbotMemoryItemDto = z.infer<typeof updateChatbotMemoryItemSchema>;

/**
 * Chatbot Context Contract
 */

export const chatbotContextSegmentSchema = z.object({
  id: z.string(),
  content: z.string(),
  source: z.string(),
  score: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotContextSegmentDto = z.infer<typeof chatbotContextSegmentSchema>;
export type ChatbotContextSegment = ChatbotContextSegmentDto;

export const chatbotContextUploadSegmentSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type ChatbotContextUploadSegmentDto = z.infer<typeof chatbotContextUploadSegmentSchema>;
export type ChatbotContextUploadSegment = ChatbotContextUploadSegmentDto;

export const chatbotContextUploadResponseSchema = z.object({
  segments: z.array(chatbotContextUploadSegmentSchema),
});

export type ChatbotContextUploadResponseDto = z.infer<typeof chatbotContextUploadResponseSchema>;
export type ChatbotContextUploadResponse = ChatbotContextUploadResponseDto;

/**
 * Chatbot Global Context DTOs
 */
export type ChatbotContextItemSource = 'manual' | 'pdf';

export interface ChatbotContextItem {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  source?: ChatbotContextItemSource;
  createdAt: string;
}

export interface ChatbotContextDraft extends ChatbotContextItem {
  active: boolean;
}

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
export type ChatbotTimelineEntry = TimelineEntry;

export const chatbotDebugStateSchema = z.object({
  activeRunId: z.string().nullable(),
  isPaused: z.boolean(),
  stepMode: z.boolean(),
  lastUpdateAt: z.string(),
  lastRequest: z.record(z.string(), z.unknown()).optional(),
  lastResponse: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotDebugStateDto = z.infer<typeof chatbotDebugStateSchema>;
export type ChatbotDebugState = ChatbotDebugStateDto;

/**
 * Chatbot UI Context Data Types
 */
export interface ChatbotMessagesData {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ChatbotSettingsData {
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: React.Dispatch<React.SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: React.Dispatch<React.SetStateAction<boolean>>;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  globalContext: string;
  setGlobalContext: React.Dispatch<React.SetStateAction<string>>;
  localContext: string;
  setLocalContext: React.Dispatch<React.SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: React.Dispatch<React.SetStateAction<'override' | 'append'>>;
  settingsDirty: boolean;
  settingsSaving: boolean;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;
}

export interface ChatbotSessionsData {
  sessions: ChatbotSessionListItem[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  sessionId: string | null;
  createNewSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface ChatbotUIData {
  debugState: ChatbotDebugState;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugState>>;
  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
}

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
  isEmbedding: z.boolean().optional(),
});

export type ModelProfileDto = z.infer<typeof modelProfileSchema>;
export type ModelProfile = ModelProfileDto;

export type ExtendedModelProfile = ModelProfile & {
  normalized: string;
  size: number | null;
  isRerank: boolean;
  isVision: boolean;
  isCode: boolean;
  isInstruct: boolean;
  isChat: boolean;
  isReasoning: boolean;
};

export const modelTaskRuleSchema = z.object({
  id: z.string().optional(),
  taskId: z.string().optional(),
  rule: z.string().optional(),
  priority: z.number().optional(),
  enabled: z.boolean().optional(),
  preferLarge: z.boolean().optional(),
  minSize: z.number().optional(),
  preferReasoning: z.boolean().optional(),
  preferSmall: z.boolean().optional(),
  targetSize: z.number().optional(),
  maxSize: z.number().optional(),
});

export type ModelTaskRuleDto = z.infer<typeof modelTaskRuleSchema>;
export type ModelTaskRule = ModelTaskRuleDto;

export const agentSettingsPayloadSchema = z.object({
  personaId: z.string().optional(),
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
  agentBrowser: z.string().optional(),
  runHeadless: z.boolean().optional(),
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
  maxSteps: z.number().optional(),
  maxStepAttempts: z.number().optional(),
  maxReplanCalls: z.number().optional(),
  replanEverySteps: z.number().optional(),
  maxSelfChecks: z.number().optional(),
  loopGuardThreshold: z.number().optional(),
  loopBackoffBaseMs: z.number().optional(),
  loopBackoffMaxMs: z.number().optional(),
});

export type AgentSettingsPayloadDto = z.infer<typeof agentSettingsPayloadSchema>;
export type AgentSettingsPayload = AgentSettingsPayloadDto;

export const chatbotAgentRunActionRouteParamsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
  action: z.string().trim().min(1, 'Action is required'),
});

export type ChatbotAgentRunActionRouteParamsDto = z.infer<
  typeof chatbotAgentRunActionRouteParamsSchema
>;
export type ChatbotAgentRunActionRouteParams = ChatbotAgentRunActionRouteParamsDto;

export const DEFAULT_AGENT_SETTINGS: AgentSettingsPayload = {
  agentBrowser: 'chromium',
  runHeadless: true,
  ignoreRobotsTxt: false,
  requireHumanApproval: false,
  maxSteps: 12,
  maxStepAttempts: 2,
  maxReplanCalls: 2,
  replanEverySteps: 2,
  maxSelfChecks: 4,
  loopGuardThreshold: 2,
  loopBackoffBaseMs: 2000,
  loopBackoffMaxMs: 12000,
};

/**
 * Extended support / Additional types
 */
export interface ChatSessionDocument {
  _id: unknown; // mongodb.ObjectId
  title: string | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession['settings'];
}

export interface ChatbotJobDocument {
  _id: unknown; // mongodb.ObjectId
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

export type AgentPlanStepDto = unknown; // To avoid error if referenced
export type AgentPlanStep = AgentPlanStepDto;

export type AgentPlanningMetaDto = unknown;
export type AgentPlanningMeta = AgentPlanningMetaDto;

export type AgentSessionContextDto = unknown;
export type AgentSessionContext = AgentSessionContextDto;

export type AgentLoginCandidatesDto = unknown;
export type AgentLoginCandidates = AgentLoginCandidatesDto;

export type ChatbotJobCreateInput = {
  sessionId: string;
  model?: string;
  payload: ChatbotJobPayload;
  resultText?: string;
  errorMessage?: string;
};

export type ChatbotJobUpdateInput = {
  status?: ChatbotJob['status'];
  model?: string;
  payload?: ChatbotJobPayload;
  resultText?: string;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date;
};

export interface ChatbotJobRepository {
  findAll(limit?: number): Promise<ChatbotJob[]>;
  findById(id: string): Promise<ChatbotJob | null>;
  findNextPending(): Promise<ChatbotJob | null>;
  create(input: ChatbotJobCreateInput): Promise<ChatbotJob>;
  update(id: string, update: ChatbotJobUpdateInput): Promise<ChatbotJob | null>;
  deleteMany(statusIn: Array<ChatbotJob['status']>): Promise<number>;
  delete(id: string): Promise<boolean>;
}
