import 'server-only';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import type { ChatMessageDto } from '@/shared/contracts/chatbot';
import { notFoundError } from '@/shared/errors/app-error';

import { callInsightChatModel } from './chat-runtime';

type InsightMessageRole = 'system' | 'user' | 'assistant';

const isInsightMessageRole = (role: ChatMessageDto['role']): role is InsightMessageRole =>
  role === 'system' || role === 'user' || role === 'assistant';

const toInsightMessages = (messages: ChatMessageDto[]): ChatMessageDto[] =>
  messages
    .filter((message): message is ChatMessageDto & { role: InsightMessageRole } =>
      isInsightMessageRole(message.role)
    )
    .map((message) => ({
      ...message,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

export const fetchSessionTranscripts = async (sessionId: string): Promise<ChatMessageDto[]> => {
  const session = await chatbotSessionRepository.findById(sessionId);
  if (session === null) {
    throw notFoundError('Chat session not found', { sessionId });
  }
  return toInsightMessages(session.messages ?? []);
};

export const generateSessionInsight = async (
  sessionId: string,
  model: string
): Promise<string> => {
  const messages = await fetchSessionTranscripts(sessionId);
  return callInsightChatModel({
    model,
    messages: [
      {
        id: 'session-insight-system',
        sessionId,
        role: 'system',
        content:
          'Summarize the important insights, decisions, unresolved questions, and next actions from this session.',
        timestamp: new Date().toISOString(),
      },
      ...messages,
    ],
    temperature: 0.2,
    maxTokens: 1200,
  });
};
