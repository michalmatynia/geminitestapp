import type { 
  AiInsightRecord, 
  AiInsightSource, 
  AiInsightType 
} from '@/shared/contracts/ai-insights';
import { appendAiInsight } from '../repository';
import { stripCodeFence } from './utils';
import { callInsightChatModel } from './chat-runtime';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';

export async function processInsightGeneration(
  type: AiInsightType,
  modelId: string,
  messages: ChatMessage[],
  prompt: { name: string; metadata?: Record<string, unknown> },
  options?: { source?: AiInsightSource }
): Promise<AiInsightRecord> {
  const content = await callInsightChatModel({ model: modelId, messages });
  return await appendAiInsight(type, {
    name: prompt.name,
    source: options?.source ?? 'manual',
    content: { text: stripCodeFence(content) },
    status: 'new',
    score: 0,
    metadata: prompt.metadata,
  });
}
