import { DtoBase, NamedDto, CreateDto, UpdateDto } from '../types/base';

/**
 * Metadata for agent teaching documents
 */
export interface AgentTeachingDocumentMetadataDto {
  title?: string | null;
  source?: string | null;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * DTO for an embedding collection
 */
export interface AgentTeachingCollectionDto extends NamedDto {
  embeddingModel: string;
}

export type CreateAgentTeachingCollectionDto = CreateDto<AgentTeachingCollectionDto>;
export type UpdateAgentTeachingCollectionDto = UpdateDto<AgentTeachingCollectionDto>;

/**
 * DTO for a document chunk (from Python ChunkDTO)
 */
export interface AgentTeachingChunkDto extends DtoBase {
  documentId: string;
  text: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}

export type CreateAgentTeachingChunkDto = CreateDto<AgentTeachingChunkDto>;
export type UpdateAgentTeachingChunkDto = UpdateDto<AgentTeachingChunkDto>;

/**
 * DTO for a teaching document (from Python DocumentDTO)
 */
export interface AgentTeachingDocumentDto extends NamedDto {
  collectionId: string;
  text: string;
  metadata: AgentTeachingDocumentMetadataDto;
  chunks?: AgentTeachingChunkDto[];
  embeddingModel: string;
  embeddingDimensions: number;
}

export type CreateAgentTeachingDocumentDto = CreateDto<AgentTeachingDocumentDto>;
export type UpdateAgentTeachingDocumentDto = UpdateDto<AgentTeachingDocumentDto>;

/**
 * DTO for a load operation (from Python LoadDTO)
 */
export interface AgentTeachingLoadDto extends DtoBase {
  source: string;
  type: string;
  metadata: Record<string, unknown>;
}

/**
 * DTO for global bio (from Python GlobalBioDTO)
 */
export interface AgentTeachingGlobalBioDto extends NamedDto {
  content: string;
  metadata: Record<string, unknown>;
}

export type CreateAgentTeachingGlobalBioDto = CreateDto<AgentTeachingGlobalBioDto>;
export type UpdateAgentTeachingGlobalBioDto = UpdateDto<AgentTeachingGlobalBioDto>;

/**
 * DTO for teaching agent settings
 */
export interface AgentTeachingAgentDto extends NamedDto {
  llmModel: string;
  embeddingModel: string;
  systemPrompt: string;
  collectionIds: string[];
  temperature: number;
  maxTokens: number;
  retrievalTopK: number;
  retrievalMinScore: number;
  maxDocsPerCollection: number;
}

export type CreateAgentTeachingAgentDto = CreateDto<AgentTeachingAgentDto>;
export type UpdateAgentTeachingAgentDto = UpdateDto<AgentTeachingAgentDto>;

/**
 * DTO for a chat source / retrieval result
 */
export interface AgentTeachingChatSourceDto {
  documentId: string;
  collectionId: string;
  score: number;
  text: string;
  metadata: AgentTeachingDocumentMetadataDto | null;
}
