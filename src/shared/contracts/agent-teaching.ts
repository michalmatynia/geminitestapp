import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Agent Teaching DTOs
 */

export const agentTeachingDocumentMetadataSchema = z.object({
  title: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
}).catchall(z.unknown());

export type AgentTeachingDocumentMetadataDto = z.infer<typeof agentTeachingDocumentMetadataSchema>;

export const agentTeachingCollectionSchema = namedDtoSchema.extend({
  embeddingModel: z.string(),
});

export type AgentTeachingCollectionDto = z.infer<typeof agentTeachingCollectionSchema>;

export const createAgentTeachingCollectionSchema = agentTeachingCollectionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentTeachingCollectionDto = z.infer<typeof createAgentTeachingCollectionSchema>;
export type UpdateAgentTeachingCollectionDto = Partial<CreateAgentTeachingCollectionDto>;

export const agentTeachingChunkSchema = dtoBaseSchema.extend({
  documentId: z.string(),
  text: z.string(),
  embedding: z.array(z.number()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AgentTeachingChunkDto = z.infer<typeof agentTeachingChunkSchema>;

export const createAgentTeachingChunkSchema = agentTeachingChunkSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentTeachingChunkDto = z.infer<typeof createAgentTeachingChunkSchema>;
export type UpdateAgentTeachingChunkDto = Partial<CreateAgentTeachingChunkDto>;

export const agentTeachingDocumentSchema = namedDtoSchema.extend({
  collectionId: z.string(),
  text: z.string(),
  metadata: agentTeachingDocumentMetadataSchema,
  chunks: z.array(agentTeachingChunkSchema).optional(),
  embeddingModel: z.string(),
  embeddingDimensions: z.number(),
});

export type AgentTeachingDocumentDto = z.infer<typeof agentTeachingDocumentSchema>;

export const createAgentTeachingDocumentSchema = agentTeachingDocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentTeachingDocumentDto = z.infer<typeof createAgentTeachingDocumentSchema>;
export type UpdateAgentTeachingDocumentDto = Partial<CreateAgentTeachingDocumentDto>;

export const agentTeachingLoadSchema = dtoBaseSchema.extend({
  source: z.string(),
  type: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AgentTeachingLoadDto = z.infer<typeof agentTeachingLoadSchema>;

export const agentTeachingGlobalBioSchema = namedDtoSchema.extend({
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AgentTeachingGlobalBioDto = z.infer<typeof agentTeachingGlobalBioSchema>;

export const createAgentTeachingGlobalBioSchema = agentTeachingGlobalBioSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentTeachingGlobalBioDto = z.infer<typeof createAgentTeachingGlobalBioSchema>;
export type UpdateAgentTeachingGlobalBioDto = Partial<CreateAgentTeachingGlobalBioDto>;

export const agentTeachingAgentSchema = namedDtoSchema.extend({
  llmModel: z.string(),
  embeddingModel: z.string(),
  systemPrompt: z.string(),
  collectionIds: z.array(z.string()),
  temperature: z.number(),
  maxTokens: z.number(),
  retrievalTopK: z.number(),
  retrievalMinScore: z.number(),
  maxDocsPerCollection: z.number(),
});

export type AgentTeachingAgentDto = z.infer<typeof agentTeachingAgentSchema>;

export const createAgentTeachingAgentSchema = agentTeachingAgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentTeachingAgentDto = z.infer<typeof createAgentTeachingAgentSchema>;
export type UpdateAgentTeachingAgentDto = Partial<CreateAgentTeachingAgentDto>;

export const agentTeachingChatSourceSchema = z.object({
  documentId: z.string(),
  collectionId: z.string(),
  score: z.number(),
  text: z.string(),
  metadata: agentTeachingDocumentMetadataSchema.nullable(),
});

export type AgentTeachingChatSourceDto = z.infer<typeof agentTeachingChatSourceSchema>;
