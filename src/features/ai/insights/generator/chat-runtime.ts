import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';

const toInsightRuntimeMessageRole = (
  role: ChatMessage['role']
): BrainChatMessage['role'] => {
  if (role === 'system' || role === 'user' || role === 'assistant') {
    return role;
  }
  throw new Error(`Unsupported AI Insights message role: ${role}`);
};

const toInsightRuntimeMessages = (messages: ChatMessage[]): BrainChatMessage[] =>
  messages.map((message: ChatMessage): BrainChatMessage => ({
    role: toInsightRuntimeMessageRole(message.role),
    content: message.content,
  }));

export const callInsightChatModel = async (params: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> => {
  const completion = await runBrainChatCompletion({
    modelId: params.model,
    messages: toInsightRuntimeMessages(params.messages),
    temperature: params.temperature ?? 0.7,
    maxTokens: params.maxTokens ?? 1000,
  });
  return completion.text.trim();
};
