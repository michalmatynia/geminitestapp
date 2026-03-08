'use client';

import type { ChatbotMemoryItem } from '@/shared/contracts/chatbot';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const chatbotMemoryKeys = {
  all: () => QUERY_KEYS.ai.chatbot.memory(),
  list: (params: string) => QUERY_KEYS.ai.chatbot.memory(params),
};

export function useChatbotMemory(params: string = ''): ListQuery<ChatbotMemoryItem> {
  const queryKey = chatbotMemoryKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ChatbotMemoryItem[]> => {
      const queryParams = params ? Object.fromEntries(new URLSearchParams(params).entries()) : null;
      const data = await api.get<ChatbotMemoryItem[] | { items?: ChatbotMemoryItem[] }>(
        '/api/chatbot/memory',
        queryParams ? { params: queryParams } : undefined
      );
      if (Array.isArray(data)) return data;
      return Array.isArray(data.items) ? data.items : [];
    },
    meta: {
      source: 'chatbot.hooks.useChatbotMemoryList',
      operation: 'list',
      resource: 'chatbot.memory',
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'memory'],
      description: 'Loads chatbot memory.'},
  });
}
