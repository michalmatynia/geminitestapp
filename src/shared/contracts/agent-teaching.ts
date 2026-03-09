import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { dtoBaseSchema } from './base';

/**
 * Agent Documentation / Context Extraction Contract
 */
export const agentTeachingSourceTypeSchema = z.enum([
  'cms-page',
  'cms-domain',
  'product-list',
  'product-item',
  'external-url',
  'file-upload',
  'manual-text',
]);

export type AgentTeachingSourceTypeDto = z.infer<typeof agentTeachingSourceTypeSchema>;
export type AgentTeachingSourceType = AgentTeachingSourceTypeDto;

export const agentTeachingDocumentMetadataSchema = z.object({
  source: agentTeachingSourceTypeSchema.optional(),
  sourceId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type AgentTeachingDocumentMetadataDto = z.infer<typeof agentTeachingDocumentMetadataSchema>;
export type AgentTeachingEmbeddingDocumentMetadata = AgentTeachingDocumentMetadataDto;

export const agentTeachingChatSourceSchema = z.object({
  documentId: z.string(),
  collectionId: z.string(),
  content: z.string().optional(),
  text: z.string().optional(),
  score: z.number(),
  metadata: agentTeachingDocumentMetadataSchema.optional(),
});

export type AgentTeachingChatSourceDto = z.infer<typeof agentTeachingChatSourceSchema>;
export type AgentTeachingChatSource = AgentTeachingChatSourceDto;

export const agentTeachingDocumentSchema = dtoBaseSchema.extend({
  collectionId: z.string(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  content: z.string(),
  text: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  tokens: z.number().optional(),
  metadata: agentTeachingDocumentMetadataSchema.optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.number().optional(),
});

export type AgentTeachingDocumentDto = z.infer<typeof agentTeachingDocumentSchema>;
export type AgentTeachingEmbeddingDocumentListItem = AgentTeachingDocumentDto;

export const agentTeachingCollectionSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  embeddingModel: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  dimensions: z.number().optional(),
  documentCount: z.number().optional(),
  totalTokens: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export type AgentTeachingCollectionDto = z.infer<typeof agentTeachingCollectionSchema>;
export type AgentTeachingEmbeddingCollectionRecord = AgentTeachingCollectionDto;

/**
 * Agent Teaching & Context Extension
 */
export const agentTeachingAgentSchema = z.object({
  id: z.string(),
  agentId: z.string().optional(),
  name: z.string(),
  description: z.string().nullable(),
  llmModel: z.string(),
  embeddingModel: z.string(),
  systemPrompt: z.string(),
  collectionIds: z.array(z.string()),
  enabled: z.boolean().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  retrievalTopK: z.number().optional(),
  retrievalMinScore: z.number().optional(),
  maxDocsPerCollection: z.number().optional(),
  topK: z.number().optional(),
  scoreThreshold: z.number().optional(),
  includeSources: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AgentTeachingAgentDto = z.infer<typeof agentTeachingAgentSchema>;
export type AgentTeachingAgentRecord = AgentTeachingAgentDto;

export const agentTeachingContextSchema = z.object({
  query: z.string(),
  results: z.array(agentTeachingChatSourceSchema),
  tokensUsed: z.number(),
});

export type AgentTeachingContextDto = z.infer<typeof agentTeachingContextSchema>;

export const agentTeachingSearchOptionsSchema = z.object({
  agentId: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
  query: z.string(),
  limit: z.number().optional(),
  minScore: z.number().optional(),
});

export type AgentTeachingSearchOptionsDto = z.infer<typeof agentTeachingSearchOptionsSchema>;

export const agentTeachingChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export type AgentTeachingChatMessageDto = z.infer<typeof agentTeachingChatMessageSchema>;
export type AgentTeachingChatMessage = AgentTeachingChatMessageDto;

export const agentTeachingChatRequestSchema = z.object({
  agentId: z.string().trim().min(1),
  messages: z.array(agentTeachingChatMessageSchema).min(1),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type AgentTeachingChatRequestDto = z.infer<typeof agentTeachingChatRequestSchema>;
export type AgentTeachingChatRequest = AgentTeachingChatRequestDto;
