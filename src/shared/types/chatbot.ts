import type { ObjectId } from "mongodb";
import type { Status } from "./common";
import type { 
  ChatMessageDto, 
  ChatbotSessionDto, 
  ChatbotJobDto, 
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto
} from "../dtos/chatbot";

export type { 
  ChatMessageDto, 
  ChatbotSessionDto, 
  ChatbotJobDto, 
  ChatbotDebugStateDto,
  ChatbotSettingsDto,
  AgentSnapshotDto,
  AgentPlanStepDto
};

/**
 * Legacy interface for backward compatibility
 */
export interface ChatMessage extends ChatMessageDto {}

export type ChatSession = Omit<ChatbotSessionDto, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

export interface ChatSessionDocument {
  _id: ObjectId;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession["settings"];
}

export type ChatbotJob = Omit<ChatbotJobDto, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
};

export type ChatbotJobStatus = Status;

export interface ChatbotJobDocument {
  _id: ObjectId;
  sessionId: string;
  status: string;
  model?: string;
  payload: any;
  resultText?: string;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export type ChatbotDebugState = ChatbotDebugStateDto;
export type ChatbotSettingsPayload = ChatbotSettingsDto;
export type AgentSnapshot = AgentSnapshotDto;
export type AgentPlanStep = AgentPlanStepDto;

// ... other types that are strictly internal can stay here if not passed to UI
