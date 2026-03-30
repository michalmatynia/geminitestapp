import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { chatbotSettingsSchema } from './chatbot-settings';
import { chatMessageSchema } from './chatbot-messages';

/**
 * Chat Session Contract
 */
export const chatSessionSchema = dtoBaseSchema.extend({
  title: z.string().nullable(),
  userId: z.string().nullable(),
  personaId: z.string().nullable().optional(),
  settings: chatbotSettingsSchema.optional(),
  lastMessageAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  messages: z.array(chatMessageSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotSessionDto = z.infer<typeof chatSessionSchema>;
export type ChatSession = ChatbotSessionDto;

export const chatbotSessionListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  personaId: z.string().nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type ChatbotSessionListItemDto = z.infer<typeof chatbotSessionListItemSchema>;
export type ChatbotSessionListItem = ChatbotSessionListItemDto;

export const chatbotSessionsQuerySchema = z.object({
  scope: z.enum(['list', 'ids']).optional(),
  query: z.string().trim().optional(),
});

export type ChatbotSessionsQueryDto = z.infer<typeof chatbotSessionsQuerySchema>;
export type ChatbotSessionsQuery = ChatbotSessionsQueryDto;

export const chatbotSessionsResponseSchema = z.object({
  sessions: z.array(chatSessionSchema).optional(),
});

export type ChatbotSessionsResponseDto = z.infer<typeof chatbotSessionsResponseSchema>;
export type ChatbotSessionsResponse = ChatbotSessionsResponseDto;

export const chatbotSessionIdsResponseSchema = z.object({
  ids: z.array(z.string()),
});

export type ChatbotSessionIdsResponseDto = z.infer<typeof chatbotSessionIdsResponseSchema>;
export type ChatbotSessionIdsResponse = ChatbotSessionIdsResponseDto;

export const chatbotSessionResponseSchema = z.object({
  session: chatSessionSchema,
});

export type ChatbotSessionResponseDto = z.infer<typeof chatbotSessionResponseSchema>;
export type ChatbotSessionResponse = ChatbotSessionResponseDto;

export const chatbotSessionCreateRequestSchema = z.object({
  title: z.string().trim().optional(),
  settings: chatbotSettingsSchema.optional(),
});

export type ChatbotSessionCreateRequestDto = z.infer<typeof chatbotSessionCreateRequestSchema>;
export type ChatbotSessionCreateRequest = ChatbotSessionCreateRequestDto;

export const chatbotSessionCreateResponseSchema = z.object({
  sessionId: z.string(),
  session: chatSessionSchema.optional(),
});

export type ChatbotSessionCreateResponseDto = z.infer<typeof chatbotSessionCreateResponseSchema>;
export type ChatbotSessionCreateResponse = ChatbotSessionCreateResponseDto;

export const chatbotSessionUpdateRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  title: z.string().trim().optional(),
});

export type ChatbotSessionUpdateRequestDto = z.infer<typeof chatbotSessionUpdateRequestSchema>;
export type ChatbotSessionUpdateRequest = ChatbotSessionUpdateRequestDto;

export const chatbotSessionDeleteRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export type ChatbotSessionDeleteRequestDto = z.infer<typeof chatbotSessionDeleteRequestSchema>;
export type ChatbotSessionDeleteRequest = ChatbotSessionDeleteRequestDto;

export const chatbotSessionsDeleteRequestSchema = z.object({
  sessionIds: z.array(z.string().trim().min(1)).min(1),
});

export type ChatbotSessionsDeleteRequestDto = z.infer<typeof chatbotSessionsDeleteRequestSchema>;
export type ChatbotSessionsDeleteRequest = ChatbotSessionsDeleteRequestDto;

export const chatbotSessionsDeleteBodySchema = z.union([
  chatbotSessionDeleteRequestSchema,
  chatbotSessionsDeleteRequestSchema,
]);

export type ChatbotSessionsDeleteBodyDto = z.infer<typeof chatbotSessionsDeleteBodySchema>;
export type ChatbotSessionsDeleteBody = ChatbotSessionsDeleteBodyDto;

export const chatbotSessionDeleteResponseSchema = z.object({
  success: z.literal(true),
  deletedCount: z.number().int().nonnegative().optional(),
});

export type ChatbotSessionDeleteResponseDto = z.infer<typeof chatbotSessionDeleteResponseSchema>;
export type ChatbotSessionDeleteResponse = ChatbotSessionDeleteResponseDto;

export const createChatSessionSchema = chatSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateChatSessionDto = z.infer<typeof createChatSessionSchema>;
export type CreateSessionInput = CreateChatSessionDto;

export const updateChatSessionSchema = createChatSessionSchema.partial();

export type UpdateChatSessionDto = z.infer<typeof updateChatSessionSchema>;
export type UpdateSessionInput = UpdateChatSessionDto;
