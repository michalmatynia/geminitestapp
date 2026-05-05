import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { AiInsightType } from '@/shared/contracts/ai-insights';

export function constructMessages(
  type: AiInsightType,
  prompt: { systemPrompt: string; userPrompt: string }
): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: `sys_${Date.now()}`,
      sessionId: 'insights_gen',
      role: 'system',
      content: prompt.systemPrompt,
      timestamp: now,
    },
    {
      id: `user_${Date.now()}`,
      sessionId: 'insights_gen',
      role: 'user',
      content: prompt.userPrompt,
      timestamp: now,
    },
  ];
}
