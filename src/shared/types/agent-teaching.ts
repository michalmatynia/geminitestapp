import type {
  AgentTeachingCollectionDto,
  AgentTeachingDocumentDto,
  AgentTeachingAgentDto,
  AgentTeachingChatSourceDto,
  AgentTeachingDocumentMetadataDto
} from "../dtos/agent-teaching";

export type {
  AgentTeachingCollectionDto,
  AgentTeachingDocumentDto,
  AgentTeachingAgentDto,
  AgentTeachingChatSourceDto,
  AgentTeachingDocumentMetadataDto
};

/**
 * Legacy ID type
 */
export type AgentTeachingId = string;

/**
 * Record types for the database layer (optional, if we want to keep them separate from DTOs)
 */
export type AgentTeachingEmbeddingCollectionRecord = AgentTeachingCollectionDto;

export type AgentTeachingEmbeddingDocumentListItem = AgentTeachingDocumentDto;

export type AgentTeachingAgentRecord = AgentTeachingAgentDto;

export type AgentTeachingChatSource = AgentTeachingChatSourceDto;

export type AgentTeachingEmbeddingDocumentMetadata = AgentTeachingDocumentMetadataDto;