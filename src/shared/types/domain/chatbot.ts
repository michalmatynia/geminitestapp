import { Status } from '../common';

import type {
  ChatMessageDto,
  ChatbotSessionDto,
  ChatbotJobDto,
  ChatbotJobPayloadDto,
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  CreateChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto,
  CreateChatSessionDto,
  UpdateChatSessionDto,
  ChatbotMemoryItemDto,
  CreateChatbotMemoryItemDto,
  UpdateChatbotMemoryItemDto,
  AgentAuditLogDto,
  AgentBrowserLogDto
} from '../../dtos/chatbot';
import type { ObjectId } from 'mongodb';

export type {
  ChatMessageDto,
  ChatbotSessionDto,
  ChatbotJobDto,
  ChatbotJobPayloadDto,
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  CreateChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto,
  CreateChatSessionDto,
  UpdateChatSessionDto,
  ChatbotMemoryItemDto,
  CreateChatbotMemoryItemDto,
  UpdateChatbotMemoryItemDto,
  AgentAuditLogDto,
  AgentBrowserLogDto
};

export type ChatMessage = ChatMessageDto;

export interface ChatSession extends Omit<ChatbotSessionDto, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSessionInput = CreateChatSessionDto;
export type UpdateSessionInput = UpdateChatSessionDto;

export interface ChatSessionDocument {
  _id: ObjectId;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession['settings'];
}

export type ChatbotJobStatus = Status;

export type ChatbotJobPayload = ChatbotJobPayloadDto;

export interface ChatbotJob extends Omit<ChatbotJobDto, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt?: Date | undefined;
  startedAt?: Date | undefined;
  finishedAt?: Date | undefined;
}

export interface ChatbotJobDocument {
  _id: ObjectId;
  sessionId: string;
  status: ChatbotJobStatus;
  model?: string | undefined;
  payload: ChatbotJobPayload;
  resultText?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: Date;
  startedAt?: Date | undefined;
  finishedAt?: Date | undefined;
}

export type ChatbotDebugState = ChatbotDebugStateDto;
export type ChatbotSettingsPayload = CreateChatbotSettingsDto;
export type AgentSnapshot = AgentSnapshotDto;
export type AgentPlanStep = AgentPlanStepDto;

export interface AgentStep {
  id?: string;
  title: string;
  tool?: string | null;
  successCriteria?: string | null;
  expectedObservation?: string | null;
  status?: string;
  phase?: string | null;
}

export interface AgentSubgoal {
  id?: string;
  title: string;
  successCriteria?: string | null;
  steps?: AgentStep[];
}

export interface AgentGoal {
  id?: string;
  title: string;
  successCriteria?: string | null;
  subgoals?: AgentSubgoal[];
}

export interface AgentPlanHierarchy {
  goals?: AgentGoal[];
}

export interface AgentPlanningMeta {
  type?: string;
  stepId?: string;
  failedStepId?: string;
  activeStepId?: string;
  reason?: string;
  branchSteps?: AgentStep[];
  steps?: AgentStep[];
  hierarchy?: AgentPlanHierarchy;
}

export interface AgentSessionContext {
  cookies?: Array<{
    name: string;
    domain: string;
    valueLength: number;
  }>;
  storage?: {
    localCount: number;
    sessionCount: number;
    localKeys?: string[];
  };
}

export interface AgentLoginCandidates {
  inputs?: Array<{
    id?: string;
    name?: string;
    type?: string;
    score: number;
  }>;
  buttons?: Array<{
    id?: string;
    name?: string;
    text?: string;
    score: number;
  }>;
}

export type AgentAuditLog = Omit<AgentAuditLogDto, 'metadata'> & {
  metadata?: AgentPlanningMeta | null;
};

export type AgentBrowserLog = Omit<AgentBrowserLogDto, 'metadata'> & {
  metadata?: AgentSessionContext | AgentLoginCandidates | null;
};

export type TimelineEntry = {
  id: string;
  source: 'audit' | 'browser';
  level?: string | null;
  message: string;
  createdAt: string;
};

export type ModelProfile = {
  name: string;
  normalized: string;
  size: number | null;
  isEmbedding: boolean;
  isRerank: boolean;
  isVision: boolean;
  isCode: boolean;
  isInstruct: boolean;
  isChat: boolean;
  isReasoning: boolean;
};

export type ModelTaskRule = {
  targetSize?: number;
  preferLarge?: boolean;
  preferSmall?: boolean;
  minSize?: number;
  maxSize?: number;
  preferReasoning?: boolean;
};

export type AgentSettingsPayload = {
  agentBrowser: string;
  runHeadless: boolean;
  ignoreRobotsTxt: boolean;
  requireHumanApproval: boolean;
  memoryValidationModel: string;
  plannerModel: string;
  selfCheckModel: string;
  extractionValidationModel: string;
  toolRouterModel: string;
  loopGuardModel: string;
  approvalGateModel: string;
  memorySummarizationModel: string;
  selectorInferenceModel: string;
  outputNormalizationModel: string;
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
  loopGuardThreshold: number;
  loopBackoffBaseMs: number;
  loopBackoffMaxMs: number;
};
