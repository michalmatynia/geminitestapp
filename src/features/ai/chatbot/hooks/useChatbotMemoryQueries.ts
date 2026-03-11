'use client';

import type { ChatbotMemoryItem } from '@/shared/contracts/chatbot';
import type { ListQuery } from '@/shared/contracts/ui';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { fetchChatbotMemory } from '../api';

export const chatbotMemoryKeys = {
  all: () => QUERY_KEYS.ai.chatbot.memory(),
  list: (params: string) => QUERY_KEYS.ai.chatbot.memory(params),
};

export function useChatbotMemory(params: string = ''): ListQuery<ChatbotMemoryItem> {
  const queryKey = chatbotMemoryKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: (): Promise<ChatbotMemoryItem[]> => fetchChatbotMemory(params),
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
