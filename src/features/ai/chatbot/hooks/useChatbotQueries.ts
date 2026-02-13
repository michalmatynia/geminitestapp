'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { chatbotKeys } from '@/shared/lib/query-key-exports';
import type { ChatSession } from '@/shared/types/domain/chatbot';

import {
  fetchChatbotSessions,
  fetchChatbotSession,
  fetchChatbotSettings,
  fetchOllamaModels,
  fetchChatbotMemory,
} from '../api';

import type { ChatbotSessionListItem } from '../types';

const normalizeModelList = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if ('models' in record) {
    return normalizeModelList(record['models']);
  }
  if ('data' in record) {
    return normalizeModelList(record['data']);
  }

  return [];
};

/**
 * Query hook for fetching all chatbot sessions
 */
export function useChatbotSessions(options?: { enabled?: boolean }): UseQueryResult<ChatbotSessionListItem[]> {
  return useQuery({
    queryKey: chatbotKeys.sessions(),
    queryFn: async (): Promise<ChatbotSessionListItem[]> => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>();
      return data.sessions ?? [];
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching session IDs only (lightweight)
 */
export function useChatbotSessionIds(query?: string, options?: { enabled?: boolean }): UseQueryResult<string[]> {
  return useQuery({
    queryKey: chatbotKeys.sessionIds(query),
    queryFn: async (): Promise<string[]> => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>({
        scope: 'ids',
        ...(query ? { query } : {}),
      });
      return data.ids ?? [];
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching a single chatbot session with messages
 */
export function useChatbotSession(sessionId: string | null, options?: { enabled?: boolean }): UseQueryResult<ChatSession | null> {
  return useQuery({
    queryKey: sessionId ? chatbotKeys.session(sessionId) : [...chatbotKeys.all, 'session', 'none'],
    queryFn: async () => {
      if (!sessionId) return null;
      return fetchChatbotSession(sessionId);
    },
    enabled: (options?.enabled ?? true) && !!sessionId,
  });
}

/**
 * Query hook for fetching chatbot settings
 */
export function useChatbotSettings(key?: string, options?: { enabled?: boolean }): UseQueryResult<{ settings?: { settings?: unknown } | null }> {
  return useQuery({
    queryKey: chatbotKeys.settings.all(key),
    queryFn: (): Promise<{ settings?: { settings?: unknown } | null }> => key ? fetchChatbotSettings(key) : Promise.resolve({ settings: null }),
    enabled: (options?.enabled ?? true) && !!key,
  });
}

/**
 * Query hook for fetching available models from the chatbot API
 */
export function useChatbotModels(options?: { enabled?: boolean }): UseQueryResult<string[]> {
  return useQuery<unknown, Error, string[]>({
    queryKey: chatbotKeys.models(),
    queryFn: async (): Promise<unknown> => {
      return api.get<unknown>('/api/chatbot');
    },
    select: (raw: unknown): string[] => normalizeModelList(raw),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching Ollama models from a custom base URL
 */
export function useOllamaModels(baseUrl: string, options?: { enabled?: boolean }): UseQueryResult<string[]> {
  return useQuery({
    queryKey: chatbotKeys.ollamaModels(baseUrl),
    queryFn: (): Promise<string[]> => fetchOllamaModels(baseUrl),
    enabled: (options?.enabled ?? true) && !!baseUrl,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Query hook for fetching chatbot memory/context
 */
export function useChatbotMemory(query?: string, options?: { enabled?: boolean }): UseQueryResult<unknown> {
  return useQuery({
    queryKey: chatbotKeys.memory(query),
    queryFn: (): Promise<unknown> => fetchChatbotMemory(query ?? ''),
    enabled: options?.enabled ?? true,
  });
}
