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
export interface AgentTeachingEmbeddingCollectionRecord extends AgentTeachingCollectionDto {}

export interface AgentTeachingEmbeddingDocumentListItem extends AgentTeachingDocumentDto {}

export interface AgentTeachingAgentRecord extends AgentTeachingAgentDto {}

export interface AgentTeachingChatSource extends AgentTeachingChatSourceDto {}

export type AgentTeachingEmbeddingDocumentMetadata = AgentTeachingDocumentMetadataDto;