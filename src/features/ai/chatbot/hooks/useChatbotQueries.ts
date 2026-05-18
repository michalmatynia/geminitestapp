import type { ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';
import type {
  ChatbotMemoryItem,
  ChatbotSessionListItem,
  ChatbotSettingsResponse,
} from '@/shared/contracts/chatbot';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { useListQueryV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
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
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ChatbotSessionListItem[]> => {
      const data = await fetchChatbotSessions();
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
  const queryKey = typeof sessionId === 'string' && sessionId !== ''
    ? chatbotKeys.session(sessionId)
    : [...chatbotKeys.all, 'session', 'none'];
  return useSingleQueryV2({
    id: sessionId,
    queryKey,
    queryFn: async () => {
      if (sessionId === null || sessionId === '') return null;
      return fetchChatbotSession(sessionId);
    },
    enabled: (options?.enabled ?? true) && typeof sessionId === 'string' && sessionId !== '',
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
  return useSingleQueryV2({
    id: key,
    queryKey,
    queryFn: (): Promise<ChatbotSettingsResponse> =>
      typeof key === 'string' && key !== '' ? fetchChatbotSettings(key) : Promise.resolve({ settings: null }),
    enabled: (options?.enabled ?? true) && typeof key === 'string' && key !== '',
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
  return useListQueryV2<string, string[]>({
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
  return useSingleQueryV2({
    id: typeof query === 'string' && query !== '' ? query : 'global',
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
