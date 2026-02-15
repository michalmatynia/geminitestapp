'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation, createListQuery } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ListQuery, MutationResult } from '@/shared/types/query-result-types';

import type { ChatbotMemoryItem } from '../types';

export const chatbotMemoryKeys = {
  all: () => QUERY_KEYS.ai.chatbot.memory(),
  list: (params: string) => QUERY_KEYS.ai.chatbot.memory(params),
};

export function useChatbotMemory(params: string = ''): ListQuery<ChatbotMemoryItem> {
  return createListQuery({
    queryKey: chatbotMemoryKeys.list(params),
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
  });
}

export function useDeleteMemoryItemMutation(): MutationResult<void, string> {
  const queryClient = useQueryClient();
  
  return createCreateMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/chatbot/memory/${id}`);
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: chatbotMemoryKeys.all() });
      },
    },
  });
}
