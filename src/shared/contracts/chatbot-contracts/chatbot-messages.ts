import { z } from 'zod';

/**
 * Chat Message Contract
 */
export const chatMessageRoleSchema = z.enum([
  'system',
  'user',
  'assistant',
  'tool',
  'error',
  'info',
  'audit',
]);

export type ChatMessageRoleDto = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: chatMessageRoleSchema,
  content: z.string(),
  timestamp: z.string(),
  model: z.string().optional(),
  images: z.array(z.string()).optional(),
  toolCalls: z.array(z.record(z.string(), z.unknown())).optional(),
  toolResults: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;
export type ChatMessage = ChatMessageDto;

export interface SimpleChatMessage<
  TContent = string,
  TRole extends string = 'user' | 'assistant' | 'system' | string,
> {
  role: TRole;
  content: TContent;
}

export const chatbotChatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string(),
  images: z.array(z.string()).optional(),
});

export type ChatbotChatMessageDto = z.infer<typeof chatbotChatMessageSchema>;
export type ChatbotChatMessage = ChatbotChatMessageDto;
