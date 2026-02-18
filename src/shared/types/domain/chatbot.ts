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
  AgentBrowserLogDto,
  AgentStepDto,
  AgentSubgoalDto,
  AgentGoalDto,
  AgentPlanHierarchyDto,
  AgentPlanningMetaDto,
  AgentSessionContextDto,
  AgentLoginCandidatesDto,
  ChatbotTimelineEntryDto,
  ModelProfileDto,
  ModelTaskRuleDto
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
  AgentBrowserLogDto,
  AgentStepDto,
  AgentSubgoalDto,
  AgentGoalDto,
  AgentPlanHierarchyDto,
  AgentPlanningMetaDto,
  AgentSessionContextDto,
  AgentLoginCandidatesDto,
  ChatbotTimelineEntryDto,
  ModelProfileDto,
  ModelTaskRuleDto
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
  title: string | null;
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

export type AgentStep = AgentStepDto;

export type AgentSubgoal = AgentSubgoalDto;

export type AgentGoal = AgentGoalDto;

export type AgentPlanHierarchy = AgentPlanHierarchyDto;

export type AgentPlanningMeta = AgentPlanningMetaDto;

export type AgentSessionContext = AgentSessionContextDto;

export type AgentLoginCandidates = AgentLoginCandidatesDto;

export type AgentAuditLog = Omit<AgentAuditLogDto, 'metadata'> & {
  metadata?: AgentPlanningMeta | null;
};

export type AgentBrowserLog = Omit<AgentBrowserLogDto, 'metadata'> & {
  metadata?: AgentSessionContext | AgentLoginCandidates | null;
};

export type TimelineEntry = ChatbotTimelineEntryDto;

export type ModelProfile = ModelProfileDto;

export type ModelTaskRule = ModelTaskRuleDto;

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
