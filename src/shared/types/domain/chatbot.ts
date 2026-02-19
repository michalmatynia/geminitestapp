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
  ModelTaskRuleDto,
  AgentSettingsPayloadDto
} from '../../contracts/chatbot';
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
  ModelTaskRuleDto,
  AgentSettingsPayloadDto
};

export type ChatMessage = ChatMessageDto;

export interface ChatSession extends ChatbotSessionDto {}

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

export type ChatbotJobPayload = ChatbotJobPayloadDto;

export interface ChatbotJob extends ChatbotJobDto {}

export interface ChatbotJobDocument {
  _id: ObjectId;
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

export type AgentAuditLog = AgentAuditLogDto;

export type AgentBrowserLog = AgentBrowserLogDto;

export type TimelineEntry = ChatbotTimelineEntryDto;

export type ModelProfile = ModelProfileDto;

export type ModelTaskRule = ModelTaskRuleDto;

export type AgentSettingsPayload = AgentSettingsPayloadDto;
