'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createCreateMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateChatbotSession,
  invalidateChatbotSessions,
  invalidateSettingsScope,
} from '@/shared/lib/query-invalidation';
import type { ChatMessage, ChatbotSettingsPayload, ChatSession } from '@/shared/types/domain/chatbot';
import type { CreateMutation, UpdateMutation } from '@/shared/types/query-result-types';

import {
  chatbotQueryKeys,
  createChatbotSession,
  updateChatbotSessionTitle,
  deleteChatbotSession,
  deleteChatbotSessions,
  persistSessionMessage,
  sendChatbotMessage,
  saveChatbotSettings,
} from '../api';

import type { ChatbotSessionListItem } from '../types';

/**
 * Mutation hook for creating a new chatbot session
 */
export function useCreateChatbotSession(): CreateMutation<{ sessionId: string; session?: ChatSession }, { title?: string; settings?: ChatSession['settings'] }> {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('create-session');

  return createCreateMutationV2({
    mutationFn: createChatbotSession,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useCreateChatbotSession',
      operation: 'create',
      resource: 'chatbot.sessions',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'sessions', 'create'],
    },
    onSuccess: (): Promise<void> => {
      return invalidateChatbotSessions(queryClient);
    },
  });
}

/**
 * Mutation hook for updating a session title
 */
export function useUpdateSessionTitle(): UpdateMutation<ChatbotSessionListItem, { sessionId: string; title: string }> {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('update-session-title');

  return createUpdateMutationV2({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateChatbotSessionTitle(sessionId, title),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useUpdateSessionTitle',
      operation: 'update',
      resource: 'chatbot.sessions.title',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'sessions', 'update-title'],
    },
    onSuccess: (_data: ChatbotSessionListItem, { sessionId }: { sessionId: string; title: string }): Promise<void> => {
      void invalidateChatbotSessions(queryClient);
      return invalidateChatbotSession(queryClient, sessionId);
    },
  });
}

/**
 * Mutation hook for deleting a single session
 */
export function useDeleteChatbotSession(): UpdateMutation<unknown, string> {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('delete-session');

  return createUpdateMutationV2({
    mutationFn: deleteChatbotSession,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useDeleteChatbotSession',
      operation: 'delete',
      resource: 'chatbot.sessions',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'sessions', 'delete'],
    },
    onSuccess: (_data: unknown, sessionId: string): void => {
      void invalidateChatbotSessions(queryClient);
      queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for deleting multiple sessions
 */
export function useDeleteChatbotSessions(): UpdateMutation<unknown, string[]> {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('delete-sessions');

  return createUpdateMutationV2({
    mutationFn: deleteChatbotSessions,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useDeleteChatbotSessions',
      operation: 'delete',
      resource: 'chatbot.sessions.bulk',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'sessions', 'bulk-delete'],
    },
    onSuccess: (_data: unknown, sessionIds: string[]): Promise<void> => {
      void invalidateChatbotSessions(queryClient);
      sessionIds.forEach((id: string): void => {
        queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(id) });
      });
      return Promise.resolve();
    },
  });
}

/**
 * Mutation hook for persisting a message to a session
 */
type PersistSessionMessageVariables = {
  sessionId: string;
  role: ChatMessage['role'];
  content: string;
};

type SaveChatbotSettingsVariables = {
  key: string;
  settings: ChatbotSettingsPayload;
};

export function usePersistSessionMessage(): UpdateMutation<void, PersistSessionMessageVariables> {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('persist-session-message');

  return createUpdateMutationV2({
    mutationFn: ({ sessionId, role, content }: PersistSessionMessageVariables): Promise<void> =>
      persistSessionMessage(sessionId, role, content),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.usePersistSessionMessage',
      operation: 'update',
      resource: 'chatbot.sessions.messages',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'sessions', 'messages', 'persist'],
    },
    onSuccess: (_data: void, { sessionId }: PersistSessionMessageVariables): Promise<void> => {
      return invalidateChatbotSession(queryClient, sessionId);
    },
  });
}

/**
 * Mutation hook for sending a chat message
 */
export function useSendChatMessage(): UpdateMutation<{ message?: string }, { messages: ChatMessage[]; model: string; sessionId?: string | null }> {
  const mutationKey = chatbotQueryKeys.mutation('send-message');
  return createUpdateMutationV2({
    mutationFn: sendChatbotMessage,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSendChatMessage',
      operation: 'action',
      resource: 'chatbot.messages',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'messages', 'send'],
    },
  });
}

/**
 * Mutation hook for saving chatbot settings
 */
export function useSaveChatbotSettings(): UpdateMutation<
  { settings?: { settings?: ChatbotSettingsPayload } },
  SaveChatbotSettingsVariables
  > {
  const queryClient = useQueryClient();
  const mutationKey = chatbotQueryKeys.mutation('save-settings');

  return createUpdateMutationV2({
    mutationFn: ({ key, settings }: SaveChatbotSettingsVariables): Promise<{ settings?: { settings?: ChatbotSettingsPayload } }> =>
      saveChatbotSettings(key, settings),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSaveChatbotSettings',
      operation: 'update',
      resource: 'chatbot.settings',
      domain: 'global',
      mutationKey,
      tags: ['chatbot', 'settings', 'save'],
    },
    onSuccess: (_data: { settings?: { settings?: ChatbotSettingsPayload } }, { key }: SaveChatbotSettingsVariables): Promise<void> => {
      return invalidateSettingsScope(queryClient, key);
    },
  });
}
