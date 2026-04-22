import type {
  ChatMessageDto as ChatMessage,
  ChatbotChatRequest,
  ChatbotChatResponseDto,
} from '@/shared/contracts/chatbot';

export const sendChatbotMessage = async (payload: {
  messages: ChatMessage[];
  sessionId?: string | null;
  contextRegistry?: ChatbotChatRequest['contextRegistry'];
}): Promise<ChatbotChatResponseDto> => {
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
