import { DtoBase, NamedDto } from '../types/base';

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

/**
 * DTO for a document chunk (from Python ChunkDTO)
 */
export interface AgentTeachingChunkDto extends DtoBase {
  documentId: string;
  text: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}

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
