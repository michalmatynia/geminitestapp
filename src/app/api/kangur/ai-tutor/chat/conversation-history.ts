import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import type { ChatMessageDto } from '@/shared/contracts/chatbot';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const CONVERSATION_HISTORY_MESSAGE_LIMIT = 30;

export const buildConversationSessionId = (
  learnerId: string,
  surface?: string | null,
  contentId?: string | null
): string => {
  const surfaceLabel = surface || 'default';
  const contentLabel = contentId || 'unknown';
  return `kangur-ai-tutor:${learnerId}:${surfaceLabel}:${contentLabel}`;
};

export const persistConversationMessage = async (
  sessionId: string,
  message: ChatMessageDto
): Promise<void> => {
  try {
    await chatbotSessionRepository.addMessage(sessionId, message);
  } catch (error) {
    void ErrorSystem.captureException(error);
    // Don't throw — conversation history is non-blocking
  }
};

export const persistConversationExchange = async (input: {
  learnerId: string;
  surface?: string | null;
  contentId?: string | null;
  userMessage: string;
  assistantMessage: string;
  answerResolutionMode?: string;
  knowledgeGraphApplied?: boolean;
  tutorMoodId?: string;
  coachingFrameMode?: string;
}): Promise<void> => {
  const sessionId = buildConversationSessionId(input.learnerId, input.surface, input.contentId);

  try {
    // Persist user message
    await chatbotSessionRepository.addMessage(sessionId, {
      id: `${sessionId}:user:${Date.now()}`,
      sessionId,
      role: 'user',
      content: input.userMessage,
      timestamp: new Date().toISOString(),
    });

    // Persist assistant message with metadata
    await chatbotSessionRepository.addMessage(sessionId, {
      id: `${sessionId}:assistant:${Date.now()}`,
      sessionId,
      role: 'assistant',
      content: input.assistantMessage,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'kangur_ai_tutor',
        answerResolutionMode: input.answerResolutionMode ?? null,
        knowledgeGraphApplied: input.knowledgeGraphApplied ?? false,
        tutorMoodId: input.tutorMoodId ?? null,
        coachingFrameMode: input.coachingFrameMode ?? null,
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    // Don't throw — conversation history is non-blocking
  }
};

export const getConversationHistory = async (
  sessionId: string,
  limit: number = CONVERSATION_HISTORY_MESSAGE_LIMIT
): Promise<ChatMessageDto[]> => {
  try {
    const session = await chatbotSessionRepository.findById(sessionId);
    if (!session?.messages) return [];
    return session.messages.slice(-limit);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};
