import { z } from 'zod';
import {
  optionalBooleanQuerySchema,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { agentPersonaMoodIdSchema } from '../agents';
import { contextRegistryConsumerEnvelopeSchema } from '../ai-context-registry';
import { dtoBaseSchema } from '../base';
import { chatbotChatMessageSchema } from './chatbot-messages';

export const chatbotChatRequestSchema = z.object({
  messages: z.array(chatbotChatMessageSchema).min(1),
  sessionId: z.string().nullable().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ChatbotChatRequestDto = z.infer<typeof chatbotChatRequestSchema>;
export type ChatbotChatRequest = ChatbotChatRequestDto;

export const chatbotJsonRequestSchema = z
  .object({
    messages: z.array(chatbotChatMessageSchema).optional(),
    sessionId: chatbotChatRequestSchema.shape.sessionId,
    contextRegistry: chatbotChatRequestSchema.shape.contextRegistry,
    model: z.unknown().optional(),
  })
  .passthrough();

export type ChatbotJsonRequestDto = z.infer<typeof chatbotJsonRequestSchema>;

export const chatbotChatResponseSchema = z.object({
  message: z.string().optional(),
  sessionId: z.string().nullable().optional(),
  suggestedMoodId: agentPersonaMoodIdSchema.nullable().optional(),
  brainApplied: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotChatResponseDto = z.infer<typeof chatbotChatResponseSchema>;

/**
 * Chatbot Job Contract
 */
export const chatbotJobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'canceled',
]);

export type ChatbotJobStatusDto = z.infer<typeof chatbotJobStatusSchema>;

export const chatbotJobPayloadSchema = z.object({
  sessionId: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ChatbotJobPayloadDto = z.infer<typeof chatbotJobPayloadSchema>;
export type ChatbotJobPayload = ChatbotJobPayloadDto;

export const chatbotJobSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  status: chatbotJobStatusSchema,
  model: z.string().nullable().optional(),
  payload: chatbotJobPayloadSchema,
  resultText: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type ChatbotJobDto = z.infer<typeof chatbotJobSchema>;
export type ChatbotJob = ChatbotJobDto;

export const enqueueChatbotJobRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  userMessage: z.string().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type EnqueueChatbotJobRequestDto = z.infer<typeof enqueueChatbotJobRequestSchema>;

export const chatbotJobsDeleteQuerySchema = z.object({
  scope: optionalTrimmedQueryString(z.enum(['terminal'])),
});

export type ChatbotJobsDeleteQueryDto = z.infer<typeof chatbotJobsDeleteQuerySchema>;

export const chatbotJobActionRequestSchema = z.object({
  action: z.string().trim().optional(),
});

export type ChatbotJobActionRequestDto = z.infer<typeof chatbotJobActionRequestSchema>;

export const chatbotJobDeleteQuerySchema = z.object({
  force: optionalBooleanQuerySchema(),
});

export type ChatbotJobDeleteQueryDto = z.infer<typeof chatbotJobDeleteQuerySchema>;

export const chatbotJobsResponseSchema = z.object({
  jobs: z.array(chatbotJobSchema),
});

export type ChatbotJobsResponseDto = z.infer<typeof chatbotJobsResponseSchema>;
export type ChatbotJobsResponse = ChatbotJobsResponseDto;

export const chatbotJobResponseSchema = z.object({
  job: chatbotJobSchema,
});

export type ChatbotJobResponseDto = z.infer<typeof chatbotJobResponseSchema>;
export type ChatbotJobResponse = ChatbotJobResponseDto;

export const chatbotJobEnqueueResponseSchema = z.object({
  jobId: z.string(),
  status: chatbotJobStatusSchema,
  brainApplied: z.object({
    modelId: z.string().optional(),
    enforced: z.boolean().optional(),
  }),
});

export type ChatbotJobEnqueueResponseDto = z.infer<typeof chatbotJobEnqueueResponseSchema>;
export type ChatbotJobEnqueueResponse = ChatbotJobEnqueueResponseDto;

export const chatbotJobActionResponseSchema = z.object({
  status: chatbotJobStatusSchema.optional(),
});

export type ChatbotJobActionResponseDto = z.infer<typeof chatbotJobActionResponseSchema>;
export type ChatbotJobActionResponse = ChatbotJobActionResponseDto;

export const chatbotJobsClearResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

export type ChatbotJobsClearResponseDto = z.infer<typeof chatbotJobsClearResponseSchema>;
export type ChatbotJobsClearResponse = ChatbotJobsClearResponseDto;

import { type SimpleDeleteResponse } from '../base';

export const chatbotJobDeleteResponseSchema = z.object({
  success: z.boolean(),
  deleted: z.literal(true).optional(), // Legacy
});

export type ChatbotJobDeleteResponse = SimpleDeleteResponse & { deleted?: true };

/**
 * Chatbot Memory Contract
 */
export const chatbotMemoryItemSchema = dtoBaseSchema.extend({
  sessionId: z.string(),
  key: z.string(),
  value: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotMemoryItemDto = z.infer<typeof chatbotMemoryItemSchema>;
export type ChatbotMemoryItem = ChatbotMemoryItemDto;

export const chatbotMemoryResponseSchema = z.object({
  items: z.array(chatbotMemoryItemSchema).optional(),
});

export type ChatbotMemoryResponseDto = z.infer<typeof chatbotMemoryResponseSchema>;
export type ChatbotMemoryResponse = ChatbotMemoryResponseDto;

export const chatbotMemoryQuerySchema = z.object({
  memoryKey: optionalTrimmedQueryString(),
  tag: optionalTrimmedQueryString(),
  q: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(100)).default(50),
});

export type ChatbotMemoryQueryDto = z.infer<typeof chatbotMemoryQuerySchema>;

export const createChatbotMemoryItemSchema = chatbotMemoryItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatbotMemoryItemDto = z.infer<typeof createChatbotMemoryItemSchema>;

export const updateChatbotMemoryItemSchema = createChatbotMemoryItemSchema.partial();

export type UpdateChatbotMemoryItemDto = z.infer<typeof updateChatbotMemoryItemSchema>;

/**
 * Chatbot Context Contract
 */

export const chatbotContextSegmentSchema = z.object({
  id: z.string(),
  content: z.string(),
  source: z.string(),
  score: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotContextSegmentDto = z.infer<typeof chatbotContextSegmentSchema>;
export type ChatbotContextSegment = ChatbotContextSegmentDto;

export const chatbotContextUploadSegmentSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type ChatbotContextUploadSegmentDto = z.infer<typeof chatbotContextUploadSegmentSchema>;
export type ChatbotContextUploadSegment = ChatbotContextUploadSegmentDto;

export const chatbotContextUploadResponseSchema = z.object({
  segments: z.array(chatbotContextUploadSegmentSchema),
});

export type ChatbotContextUploadResponseDto = z.infer<typeof chatbotContextUploadResponseSchema>;
export type ChatbotContextUploadResponse = ChatbotContextUploadResponseDto;

/**
 * Chatbot Global Context DTOs
 */
export type ChatbotContextItemSource = 'manual' | 'pdf';

export interface ChatbotContextItem {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  source?: ChatbotContextItemSource;
  fileName?: string | null;
  fileSize?: number | null;
  segmentCount?: number;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export const chatbotContextItemsResponseSchema = z.object({
  items: z.array(z.any()), // Simplified for now
});

export type ChatbotContextItemsResponseDto = z.infer<typeof chatbotContextItemsResponseSchema>;
export type ChatbotContextItemsResponse = ChatbotContextItemsResponseDto;
