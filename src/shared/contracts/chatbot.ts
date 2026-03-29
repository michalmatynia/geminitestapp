import { z } from 'zod';
import type * as React from 'react';

export * from './chatbot-contracts/chatbot-settings';
export * from './chatbot-contracts/chatbot-messages';
export * from './chatbot-contracts/chatbot-sessions';
export * from './chatbot-contracts/chatbot-interactions';

import {
  chatbotSettingsSchema,
  parseChatbotSettingsPayload,
  type ChatbotSettingsDto,
  type ChatbotSettingsPayload,
} from './chatbot-contracts/chatbot-settings';
import {
  chatMessageRoleSchema,
  chatMessageSchema,
  type ChatMessageDto,
} from './chatbot-contracts/chatbot-messages';
import {
  chatSessionSchema,
  type ChatbotSessionDto,
  type ChatbotSessionListItemDto,
} from './chatbot-contracts/chatbot-sessions';
import {
  chatbotChatRequestSchema,
  chatbotChatResponseSchema,
  chatbotJobSchema,
  chatbotMemoryItemSchema,
  chatbotContextSegmentSchema,
  type ChatbotContextItem,
  type ChatbotJobDto,
  type ChatbotJobPayloadDto,
} from './chatbot-contracts/chatbot-interactions';

export {
  chatbotSettingsSchema,
  parseChatbotSettingsPayload,
  chatMessageRoleSchema,
  chatMessageSchema,
  chatSessionSchema,
  chatbotChatRequestSchema,
  chatbotChatResponseSchema,
  chatbotJobSchema,
  chatbotMemoryItemSchema,
  chatbotContextSegmentSchema,
};

export type {
  ChatbotSettingsPayload as AgentSettingsPayload,
  ChatMessageDto,
  ChatbotSessionDto,
};
export type { AgentAuditLogRecordDtoBase as AgentAuditLogDto } from './agent-runtime';

export const chatbotSessionMessageCreateRequestSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string().trim().min(1),
  images: z.array(z.string()).optional(),
});
export type ChatbotSessionMessageCreateRequestDto = z.infer<
  typeof chatbotSessionMessageCreateRequestSchema
>;
export type ChatbotSessionMessageCreateRequest = ChatbotSessionMessageCreateRequestDto;

export const chatbotSessionMessageResponseSchema = z.object({
  message: chatMessageSchema,
});
export type ChatbotSessionMessageResponseDto = z.infer<
  typeof chatbotSessionMessageResponseSchema
>;
export type ChatbotSessionMessageResponse = ChatbotSessionMessageResponseDto;

export const chatbotSessionMessagesResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
});
export type ChatbotSessionMessagesResponseDto = z.infer<
  typeof chatbotSessionMessagesResponseSchema
>;
export type ChatbotSessionMessagesResponse = ChatbotSessionMessagesResponseDto;

export const chatbotAgentRunActionRouteParamsSchema = z.object({
  runId: z.string().trim().min(1),
  action: z.string().trim().min(1),
});
export type ChatbotAgentRunActionRouteParamsDto = z.infer<
  typeof chatbotAgentRunActionRouteParamsSchema
>;
export type ChatbotAgentRunActionRouteParams = ChatbotAgentRunActionRouteParamsDto;

export type ChatbotContextDraft = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: 'manual' | 'pdf';
  createdAt: string;
  active: boolean;
  summary?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  segmentCount?: number;
  updatedAt?: string;
};

export type ChatbotDebugStateDto = {
  activeRunId: string | null;
  isPaused: boolean;
  stepMode: boolean;
  lastUpdateAt: string;
  lastRequest?: unknown;
  lastResponse?: unknown;
};
export type ChatbotDebugState = ChatbotDebugStateDto;

export type ChatbotMessagesData = {
  messages: ChatMessageDto[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageDto[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
};

export type ChatbotSettingsData = {
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
};

export type ChatbotSessionsData = {
  sessions: ChatbotSessionListItemDto[];
  currentSessionId: string | null;
  sessionId: string | null;
  sessionsLoading: boolean;
  createNewSession: (initialSettings?: Partial<ChatbotSettingsDto>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: React.Dispatch<React.SetStateAction<string | null>>;
};

export type ChatbotUIData = {
  debugState: ChatbotDebugStateDto;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugStateDto>>;
  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
};

export type ChatbotJobCreateInput = {
  sessionId: string;
  model?: string | null;
  payload: ChatbotJobPayloadDto;
  resultText?: string | null;
  errorMessage?: string | null;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
};

export type ChatbotJobUpdateInput = Partial<{
  status: ChatbotJobDto['status'];
  model: string | null;
  payload: ChatbotJobPayloadDto;
  resultText: string | null;
  errorMessage: string | null;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
}>;

export type ChatbotJobRepository = {
  findAll(limit?: number): Promise<ChatbotJobDto[]>;
  findById(id: string): Promise<ChatbotJobDto | null>;
  findNextPending(): Promise<ChatbotJobDto | null>;
  create(input: ChatbotJobCreateInput): Promise<ChatbotJobDto>;
  update(id: string, update: ChatbotJobUpdateInput): Promise<ChatbotJobDto | null>;
  deleteMany(statusIn: Array<ChatbotJobDto['status']>): Promise<number>;
  delete(id: string): Promise<boolean>;
};

export type ModelTaskRuleDto = {
  preferLarge?: boolean;
  preferSmall?: boolean;
  targetSize?: number;
  minSize?: number;
  maxSize?: number;
  preferReasoning?: boolean;
};
export type ModelTaskRule = ModelTaskRuleDto;

export type ModelProfileDto = {
  id?: string;
  name: string;
  provider?: string;
  capabilities?: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  normalized?: string;
  size?: number | null;
  isEmbedding?: boolean;
  isRerank?: boolean;
  isVision?: boolean;
  isCode?: boolean;
  isInstruct?: boolean;
  isChat?: boolean;
  isReasoning?: boolean;
};

type ModelProfileBooleanFlags = Required<
  Pick<
    ModelProfileDto,
    'isEmbedding' | 'isRerank' | 'isVision' | 'isCode' | 'isInstruct' | 'isChat' | 'isReasoning'
  >
>;

type ModelProfileRequiredFields = Required<
  Pick<ModelProfileDto, 'provider' | 'capabilities' | 'contextWindow' | 'maxOutputTokens'>
>;

export type ExtendedModelProfile = ModelProfileRequiredFields &
  ModelProfileBooleanFlags & {
    id: string;
    name: ModelProfileDto['name'];
    normalized: string;
    size: number | null;
  };

export type ChatbotTimelineEntryDto = {
  id: string;
  type: 'log' | 'message' | 'state';
  level?: string | null;
  content: string;
  timestamp?: string | null;
  metadata?: unknown;
};

export type AgentBrowserLogDto = {
  id: string;
  runId: string;
  stepId?: string | null;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string | null;
};

export const DEFAULT_AGENT_SETTINGS: ChatbotSettingsPayload = {
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

export type ChatbotMessagesDataDto = ChatbotMessagesData;
export type ChatbotSettingsDataDto = ChatbotSettingsData;
export type ChatbotSessionsDataDto = ChatbotSessionsData;
export type ChatbotUIDataDto = ChatbotUIData;
export type ChatbotContextItemDto = ChatbotContextItem;
