import type { ChatbotMemoryItem } from '@/shared/contracts/chatbot';

import { requestJson } from './client';

export const fetchChatbotMemory = async (queryString: string): Promise<ChatbotMemoryItem[]> => {
  const url = queryString ? `/api/chatbot/memory?${queryString}` : '/api/chatbot/memory';
  const data = await requestJson<{ items?: ChatbotMemoryItem[] }>(url, undefined, {
    fallbackMessage: 'Failed to load memory.',
  });
  return data.items ?? [];
};
