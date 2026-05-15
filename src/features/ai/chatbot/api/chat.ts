/**
 * Chatbot API Client
 * 
 * Provides client-side interface for interacting with the AI Chatbot backend.
 * This module abstracts the HTTP transport layer for sending user messages 
 * and receiving chatbot responses, maintaining the consistency of the API contract.
 * 
 * Features:
 * - Message Transmission: Properly formats and dispatches chat threads to the server.
 * - Context Preservation: Supports session and context registry integration for stateful conversations.
 * - Error Handling: Provides basic error propagation for failed request attempts.
 * 
 * Usage:
 * Use the exported `sendChatbotMessage` function in frontend components to
 * initiate and maintain chat sessions.
 */

import type {
  ChatMessageDto as ChatMessage,
  ChatbotChatRequest,
  ChatbotChatResponseDto,
} from '@/shared/contracts/chatbot';

/**
 * Payload structure for sending a new message to the chatbot.
 */
export interface ChatbotMessagePayload {
  /** The sequence of messages in the current thread. */
  messages: ChatMessage[];
  /** Optional session identifier for continuing an existing thread. */
  sessionId?: string | null;
  /** Context registry settings for scoped knowledge access. */
  contextRegistry?: ChatbotChatRequest['contextRegistry'];
}

/**
 * Sends a chat message to the backend chatbot engine and returns the response.
 * 
 * @param payload - The message thread and associated session metadata.
 * @returns The chatbot's response DTO.
 * @throws Error if the API request fails or returns a non-200 status.
 */
export const sendChatbotMessage = async (payload: ChatbotMessagePayload): Promise<ChatbotChatResponseDto> => {
  const requestPayload: ChatbotChatRequest = {
    messages: payload.messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...((message.images?.length ?? 0) > 0 ? { images: message.images } : {}),
    })),
    ...(payload.sessionId !== undefined ? { sessionId: payload.sessionId } : {}),
    ...(payload.contextRegistry ? { contextRegistry: payload.contextRegistry } : {}),
  };
  const res = await fetch('/api/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
  });
  if (!res.ok) {
    throw new Error('Failed to send message');
  }
  return (await res.json()) as ChatbotChatResponseDto;
};
