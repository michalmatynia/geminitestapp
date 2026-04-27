import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';
import type { ChatMessageDto } from '@/shared/contracts/chatbot';
import { callInsightChatModel } from './chat-runtime';

export type InsightPromptMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const mapMessage = (msg: ChatMessageDto): ChatMessageDto => ({
  role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'system',
  content: msg.content,
});

export const fetchSessionTranscripts = async (sessionId: string): Promise<ChatMessageDto[]> => {
  const session = await chatbotSessionRepository.findById(sessionId);
  if (!session) {
    throw new Error(`Chatbot session not found: ${sessionId}`);
  }
  return session.messages.map(mapMessage);
};

export const generateSessionInsight = async (sessionId: string, model: string): Promise<string> => {
  const messages = await fetchSessionTranscripts(sessionId);
  
  const systemPrompt: ChatMessageDto = {
    role: 'system',
    content: 'Summarize the user intent and identify key topics discussed in the following chatbot session transcript.',
  };

  const modelMessages = [systemPrompt, ...messages];

  return callInsightChatModel({
    model,
    messages: modelMessages,
  });
};
