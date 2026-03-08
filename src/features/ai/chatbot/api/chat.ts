import type {
  ChatMessageDto as ChatMessage,
  ChatbotChatResponseDto,
} from '@/shared/contracts/chatbot';

export const sendChatbotMessage = async (payload: {
  messages: ChatMessage[];
  sessionId?: string | null;
}): Promise<ChatbotChatResponseDto> => {
  const res = await fetch('/api/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to send message');
  }
  return (await res.json()) as ChatbotChatResponseDto;
};
