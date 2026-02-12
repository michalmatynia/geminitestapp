'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { invalidateChatbotMemory } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { ChatbotMemoryItem } from '../types';

export const memoryKeys = {
  all: QUERY_KEYS.ai.chatbot.memory(),
  list: (params: string) => QUERY_KEYS.ai.chatbot.memory(params),
};

export function useChatbotMemory(params: string = ''): UseQueryResult<ChatbotMemoryItem[], Error> {
  return useQuery({
    queryKey: memoryKeys.list(params),
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

export function useDeleteMemoryItem(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/chatbot/memory/${id}`);
    },
    onSuccess: () => {
      void invalidateChatbotMemory(queryClient);
    },
  });
}
