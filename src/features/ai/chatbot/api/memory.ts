import {
  chatbotMemoryResponseSchema,
  type ChatbotMemoryItem,
  type ChatbotMemoryResponse,
} from '@/shared/contracts/chatbot';

import { requestJson } from './client';

export const fetchChatbotMemory = async (queryString: string): Promise<ChatbotMemoryItem[]> => {
  const url = queryString !== '' ? `/api/chatbot/memory?${queryString}` : '/api/chatbot/memory';
  const data = chatbotMemoryResponseSchema.parse(
    await requestJson<ChatbotMemoryResponse>(url, undefined, {
      fallbackMessage: 'Failed to load memory.',
    })
  );
  return data.items ?? [];
};
