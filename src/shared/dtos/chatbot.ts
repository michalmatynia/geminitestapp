import { DtoBase, CreateDto, UpdateDto } from '../types/base';

import type { Status } from '../types/common';

/**
 * DTO for a single chat message
 */
export interface ChatMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for a chat session
 */
export interface ChatbotSessionDto extends DtoBase {
  title: string;
  userId: string | null;
  messages: ChatMessageDto[];
  messageCount: number;
  settings?: ChatbotSessionSettingsDto | undefined;
}

/**
 * DTO for chat session settings
 */
export interface ChatbotSessionSettingsDto {
  model?: string;
  webSearchEnabled?: boolean;
  useGlobalContext?: boolean;
  useLocalContext?: boolean;
}

/**
 * DTO for a chatbot memory item
 */
export interface ChatbotMemoryItemDto extends DtoBase {
  key: string;
  value: string;
  type: string;
}

export type CreateChatbotMemoryItemDto = CreateDto<ChatbotMemoryItemDto>;
export type UpdateChatbotMemoryItemDto = UpdateDto<ChatbotMemoryItemDto>;

/**
 * DTO for an agent audit log
 */
export interface AgentAuditLogDto extends DtoBase {
  message: string;
  metadata?: Record<string, unknown> | null;
  level: 'info' | 'warning' | 'error';
}

/**
 * DTO for an agent browser log
 */
export interface AgentBrowserLogDto extends DtoBase {
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * DTO for a context segment
 */
export interface ChatbotContextSegmentDto extends DtoBase {
  content: string;
  type: string;
  priority: number;
}

/**
 * DTO for chatbot global settings
 */
export interface ChatbotSettingsDto extends DtoBase {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableMemory: boolean;
  enableContext: boolean;
  webSearchEnabled: boolean;
  useGlobalContext: boolean;
  useLocalContext: boolean;
  localContextMode: 'override' | 'append';
  searchProvider: string;
  playwrightPersonaId?: string | null;
  agentModeEnabled: boolean;
  agentBrowser: string;
  runHeadless: boolean;
  ignoreRobotsTxt: boolean;
  requireHumanApproval: boolean;
  // Model specific overrides for sub-tasks
  memoryValidationModel: string | null;
  plannerModel: string | null;
  selfCheckModel: string | null;
  extractionValidationModel: string | null;
  toolRouterModel: string | null;
  loopGuardModel: string | null;
  approvalGateModel: string | null;
  memorySummarizationModel: string | null;
  selectorInferenceModel: string | null;
  outputNormalizationModel: string | null;
  // Agent planning settings
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
  loopGuardThreshold: number;
  loopBackoffBaseMs: number;
  loopBackoffMaxMs: number;
}

export type CreateChatbotSettingsDto = CreateDto<ChatbotSettingsDto>;
export type UpdateChatbotSettingsDto = UpdateDto<ChatbotSettingsDto>;

/**
 * DTO for creating a chat session
 */
export type CreateChatSessionDto = CreateDto<ChatbotSessionDto>;

/**
 * DTO for updating a chat session
 */
export type UpdateChatSessionDto = UpdateDto<ChatbotSessionDto>;

/**
 * DTO for sending a message
 */
export interface SendMessageDto {
  sessionId: string;
  content: string;
  role?: 'user' | 'system';
  images?: string[];
}

/**
 * DTO for chatbot debug state
 */
export interface ChatbotDebugStateDto {
  lastRequest?: Record<string, unknown>;
  lastResponse?: {
    ok: boolean;
    durationMs: number;
    error?: string;
    errorId?: string;
  };
}

/**
 * DTO for chatbot job payload
 */
export interface ChatbotJobPayloadDto {
  messages: ChatMessageDto[];
  model: string;
}

/**
 * DTO for enqueuing a chatbot job
 */
export interface EnqueueChatbotJobRequestDto {
  sessionId: string;
  model: string;
  messages: ChatMessageDto[];
  userMessage?: string;
}

/**
 * DTO for a chatbot job (AI processing)
 */
export interface ChatbotJobDto extends DtoBase {
  sessionId: string;
  status: Status;
  model?: string | undefined;
  payload: ChatbotJobPayloadDto;
  resultText?: string | undefined;
  errorMessage?: string | undefined;
}

/**
 * DTO for an agent snapshot
 */
export interface AgentSnapshotDto extends DtoBase {
  url: string;
  title: string | null;
  domText: string;
  domHtml?: string | null;
  screenshotUrl?: string | null;
  screenshotData?: string | null;
  screenshotPath?: string | null;
  stepId?: string | null;
  mouseX: number | null;
  mouseY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

/**
 * DTO for an agent plan step
 */
export interface AgentPlanStepDto extends DtoBase {
  title: string;
  status: Status;
  snapshotId?: string | null;
  logCount?: number | null;
  dependsOn?: string[] | null;
  phase?: string | null;
  priority?: number | null;
}