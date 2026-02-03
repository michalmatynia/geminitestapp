import type { ObjectId } from "mongodb";
import { Status } from './common';
import type {
  ChatMessageDto,
  ChatbotSessionDto,
  ChatbotJobDto,
  ChatbotJobPayloadDto,
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto,
  CreateChatSessionDto,
  UpdateChatSessionDto
} from "../dtos/chatbot";

export type {
  ChatMessageDto,
  ChatbotSessionDto,
  ChatbotJobDto,
  ChatbotJobPayloadDto,
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto,
  CreateChatSessionDto,
  UpdateChatSessionDto
};

/**
 * Legacy interface for backward compatibility
 */
export type ChatMessage = ChatMessageDto;

export interface ChatSession extends Omit<ChatbotSessionDto, "createdAt" | "updatedAt"> {
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
  settings?: ChatSession["settings"];
}

export type ChatbotJobStatus = Status;

export type ChatbotJobPayload = ChatbotJobPayloadDto;

export interface ChatbotJob extends Omit<ChatbotJobDto, "createdAt" | "updatedAt"> {
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
export type ChatbotSettingsPayload = ChatbotSettingsDto;
export type AgentSnapshot = AgentSnapshotDto;
export type AgentPlanStep = AgentPlanStepDto;

export type AgentAuditLog = {
  id: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  level: "info" | "warning" | "error";
};

export type AgentBrowserLog = {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type TimelineEntry = {
  id: string;
  source: "audit" | "browser";
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
