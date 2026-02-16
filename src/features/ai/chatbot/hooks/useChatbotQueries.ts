'use client';

import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { chatbotKeys } from '@/shared/lib/query-key-exports';
import type { ChatSession } from '@/shared/types/domain/chatbot';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';

import {
  fetchChatbotSessions,
  fetchChatbotSession,
  fetchChatbotSettings,
  fetchOllamaModels,
  fetchChatbotMemory,
  fetchChatbotModels,
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
export function useChatbotSessions(options?: { enabled?: boolean }): ListQuery<ChatbotSessionListItem> {
  const queryKey = chatbotKeys.sessions();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ChatbotSessionListItem[]> => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>();
      return data.sessions ?? [];
    },
    enabled: options?.enabled ?? true,
    meta: {
      source: 'chatbot.hooks.useChatbotSessions',
      operation: 'list',
      resource: 'chatbot.sessions',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'sessions'],
    },
  });
}

/**
 * Query hook for fetching session IDs only (lightweight)
 */
export function useChatbotSessionIds(query?: string, options?: { enabled?: boolean }): ListQuery<string> {
  const queryKey = chatbotKeys.sessionIds(query);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>({
        scope: 'ids',
        ...(query ? { query } : {}),
      });
      return data.ids ?? [];
    },
    enabled: options?.enabled ?? true,
    meta: {
      source: 'chatbot.hooks.useChatbotSessionIds',
      operation: 'list',
      resource: 'chatbot.sessions.ids',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'sessions', 'ids'],
    },
  });
}

/**
 * Query hook for fetching a single chatbot session with messages
 */
export function useChatbotSession(sessionId: string | null, options?: { enabled?: boolean }): SingleQuery<ChatSession | null> {
  const queryKey = sessionId ? chatbotKeys.session(sessionId) : [...chatbotKeys.all, 'session', 'none'];
  return createSingleQueryV2({
    id: sessionId,
    queryKey,
    queryFn: async () => {
      if (!sessionId) return null;
      return fetchChatbotSession(sessionId);
    },
    enabled: (options?.enabled ?? true) && !!sessionId,
    meta: {
      source: 'chatbot.hooks.useChatbotSession',
      operation: 'detail',
      resource: 'chatbot.sessions.detail',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'sessions', 'detail'],
    },
  });
}

/**
 * Query hook for fetching chatbot settings
 */
export function useChatbotSettings(key?: string, options?: { enabled?: boolean }): SingleQuery<{ settings?: { settings?: unknown } | null }> {
  const queryKey = chatbotKeys.settings.all(key);
  return createSingleQueryV2({
    id: key,
    queryKey,
    queryFn: (): Promise<{ settings?: { settings?: unknown } | null }> => key ? fetchChatbotSettings(key) : Promise.resolve({ settings: null }),
    enabled: (options?.enabled ?? true) && !!key,
    meta: {
      source: 'chatbot.hooks.useChatbotSettings',
      operation: 'detail',
      resource: 'chatbot.settings',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'settings'],
    },
  });
}

/**
 * Query hook for fetching available models from the chatbot API
 */
export function useChatbotModels(options?: { enabled?: boolean; staleTime?: number }): ListQuery<string> {
  const queryKey = chatbotKeys.models();
  return createListQueryV2<string, string[]>({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      const raw = await fetchChatbotModels();
      return normalizeModelList(raw);
    },
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'chatbot.hooks.useChatbotModels',
      operation: 'list',
      resource: 'chatbot.models',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'models'],
    },
  });
}

/**
 * Query hook for fetching Ollama models from a custom base URL
 */
export function useOllamaModels(baseUrl: string, options?: { enabled?: boolean }): ListQuery<string> {
  const queryKey = chatbotKeys.ollamaModels(baseUrl);
  return createListQueryV2({
    queryKey,
    queryFn: (): Promise<string[]> => fetchOllamaModels(baseUrl),
    enabled: (options?.enabled ?? true) && !!baseUrl,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      source: 'chatbot.hooks.useOllamaModels',
      operation: 'list',
      resource: 'chatbot.models.ollama',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'models', 'ollama'],
    },
  });
}

/**
 * Query hook for fetching chatbot memory/context
 */
export function useChatbotMemory(query?: string, options?: { enabled?: boolean }): SingleQuery<unknown> {
  const queryKey = chatbotKeys.memory(query);
  return createSingleQueryV2({
    id: query || 'global',
    queryKey,
    queryFn: (): Promise<unknown> => fetchChatbotMemory(query ?? ''),
    enabled: options?.enabled ?? true,
    meta: {
      source: 'chatbot.hooks.useChatbotMemory',
      operation: 'detail',
      resource: 'chatbot.memory',
      domain: 'global',
      queryKey,
      tags: ['chatbot', 'memory'],
    },
  });
}
