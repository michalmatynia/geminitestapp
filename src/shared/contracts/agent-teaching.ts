import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { aiNodeTypeSchema } from './ai-paths';

/**
 * Agent Documentation / Context Extraction Contract
 */
export const agentTeachingChatSourceSchema = z.enum([
  'cms-page',
  'cms-domain',
  'product-list',
  'product-item',
  'external-url',
  'file-upload',
  'manual-text',
]);

export type AgentTeachingChatSourceDto = z.infer<typeof agentTeachingChatSourceSchema>;
export type AgentTeachingChatSource = AgentTeachingChatSourceDto;

export const agentTeachingDocumentMetadataSchema = z.object({
  source: agentTeachingChatSourceSchema,
  sourceId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type AgentTeachingDocumentMetadataDto = z.infer<typeof agentTeachingDocumentMetadataSchema>;
export type AgentTeachingEmbeddingDocumentMetadata = AgentTeachingDocumentMetadataDto;

export const agentTeachingDocumentSchema = dtoBaseSchema.extend({
  collectionId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  tokens: z.number().optional(),
  metadata: agentTeachingDocumentMetadataSchema.optional(),
});

export type AgentTeachingDocumentDto = z.infer<typeof agentTeachingDocumentSchema>;
export type AgentTeachingEmbeddingDocumentListItem = AgentTeachingDocumentDto;

export const agentTeachingCollectionSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string(),
  provider: z.string(),
  model: z.string(),
  dimensions: z.number(),
  documentCount: z.number(),
  totalTokens: z.number(),
  isDefault: z.boolean(),
});

export type AgentTeachingCollectionDto = z.infer<typeof agentTeachingCollectionSchema>;
export type AgentTeachingEmbeddingCollectionRecord = AgentTeachingCollectionDto;

/**
 * Agent Teaching & Context Extension
 */
export const agentTeachingAgentSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  collectionIds: z.array(z.string()),
  enabled: z.boolean(),
  topK: z.number().optional(),
  scoreThreshold: z.number().optional(),
  includeSources: z.boolean().optional(),
});

export type AgentTeachingAgentDto = z.infer<typeof agentTeachingAgentSchema>;
export type AgentTeachingAgentRecord = AgentTeachingAgentDto;

export const agentTeachingContextSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      documentId: z.string(),
      content: z.string(),
      score: z.number(),
      metadata: agentTeachingDocumentMetadataSchema.optional(),
    })
  ),
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
