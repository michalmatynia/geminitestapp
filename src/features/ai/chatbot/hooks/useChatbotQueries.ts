import type { ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';
import type {
  ChatbotMemoryItem,
  ChatbotSessionListItem,
  ChatbotSettingsResponse,
} from '@/shared/contracts/chatbot';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { brainKeys, chatbotKeys } from '@/shared/lib/query-key-exports';

import {
  fetchChatbotSessions,
  fetchChatbotSession,
  fetchChatbotSettings,
  fetchChatbotMemory,
  fetchChatbotModels,
} from '../api';

/**
 * Query hook for fetching all chatbot sessions
 */
export function useChatbotSessions(options?: {
  enabled?: boolean;
}): ListQuery<ChatbotSessionListItem> {
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
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'sessions'],
      description: 'Loads chatbot sessions.'},
  });
}

/**
 * Query hook for fetching a single chatbot session with messages
 */
export function useChatbotSession(
  sessionId: string | null,
  options?: { enabled?: boolean }
): SingleQuery<ChatSession | null> {
  const queryKey = sessionId
    ? chatbotKeys.session(sessionId)
    : [...chatbotKeys.all, 'session', 'none'];
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
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'sessions', 'detail'],
      description: 'Loads chatbot sessions detail.'},
  });
}

/**
 * Query hook for fetching chatbot settings
 */
export function useChatbotSettings(
  key?: string,
  options?: { enabled?: boolean }
): SingleQuery<ChatbotSettingsResponse> {
  const queryKey = chatbotKeys.settings.all(key);
  return createSingleQueryV2({
    id: key,
    queryKey,
    queryFn: (): Promise<ChatbotSettingsResponse> =>
      key ? fetchChatbotSettings(key) : Promise.resolve({ settings: null }),
    enabled: (options?.enabled ?? true) && !!key,
    meta: {
      source: 'chatbot.hooks.useChatbotSettings',
      operation: 'detail',
      resource: 'chatbot.settings',
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'settings'],
      description: 'Loads chatbot settings.'},
  });
}

/**
 * Query hook for fetching available models from the chatbot API
 */
export function useChatbotModels(options?: {
  enabled?: boolean;
  staleTime?: number;
}): ListQuery<string> {
  const queryKey = brainKeys.models();
  return createListQueryV2<string, string[]>({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      const response = await fetchChatbotModels();
      return response.models;
    },
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'chatbot.hooks.useChatbotModels',
      operation: 'list',
      resource: 'brain.models',
      domain: 'chatbot',
      queryKey,
      tags: ['brain', 'models'],
      description: 'Loads brain models.'},
  });
}

/**
 * Query hook for fetching chatbot memory/context
 */
export function useChatbotMemory(
  query?: string,
  options?: { enabled?: boolean }
): SingleQuery<ChatbotMemoryItem[]> {
  const queryKey = chatbotKeys.memory(query);
  return createSingleQueryV2({
    id: query || 'global',
    queryKey,
    queryFn: (): Promise<ChatbotMemoryItem[]> => fetchChatbotMemory(query ?? ''),
    enabled: options?.enabled ?? true,
    meta: {
      source: 'chatbot.hooks.useChatbotMemory',
      operation: 'detail',
      resource: 'chatbot.memory',
      domain: 'chatbot',
      queryKey,
      tags: ['chatbot', 'memory'],
      description: 'Loads chatbot memory.'},
  });
}
