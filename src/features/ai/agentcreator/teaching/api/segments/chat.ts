import type {
  AgentTeachingChatResponse,
  AgentTeachingChatRequest,
  AgentTeachingChatMessage,
} from '@/shared/contracts/agent-teaching';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

/**
 * Chat with a teaching agent
 */
export async function teachingChat(
  agentId: string,
  messages: ChatMessage[],
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): Promise<AgentTeachingChatResponse> {
  const normalizedMessages: AgentTeachingChatMessage[] = messages
    .map((message): AgentTeachingChatMessage | null => {
      if (message.role === 'user' || message.role === 'assistant' || message.role === 'system') {
        return { role: message.role, content: message.content };
      }
      return null;
    })
    .filter((message): message is AgentTeachingChatMessage => message !== null);
  const payload: AgentTeachingChatRequest = {
    agentId,
    messages: normalizedMessages,
    ...(contextRegistry ? { contextRegistry } : {}),
  };
  return api.post<AgentTeachingChatResponse>('/api/agentcreator/teaching/chat', payload);
}
