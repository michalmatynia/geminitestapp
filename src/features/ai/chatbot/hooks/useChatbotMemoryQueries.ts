'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createDeleteMutationV2, createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';

import type { ChatbotMemoryItem } from '../types';

export const chatbotMemoryKeys = {
  all: () => QUERY_KEYS.ai.chatbot.memory(),
  list: (params: string) => QUERY_KEYS.ai.chatbot.memory(params),
};

export function useChatbotMemory(params: string = ''): ListQuery<ChatbotMemoryItem> {
  const queryKey = chatbotMemoryKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ChatbotMemoryItem[]> => {
      const queryParams = params
        ? Object.fromEntries(new URLSearchParams(params).entries())
        : null;
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
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'memory'],
    },
  });
}

export function useDeleteMemoryItemMutation(): MutationResult<void, string> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.ai.chatbot.mutation('delete-memory-item');

  return createDeleteMutationV2({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/chatbot/memory/${id}`);
    },
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useDeleteMemoryItemMutation',
      operation: 'delete',
      resource: 'chatbot.memory',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'memory', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatbotMemoryKeys.all() });
    },
  });
}
