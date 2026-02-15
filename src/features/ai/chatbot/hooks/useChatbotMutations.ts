'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createCreateMutation, createUpdateMutation } from '@/shared/lib/query-factories';
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

  return createCreateMutation({
    mutationFn: createChatbotSession,
    options: {
      onSuccess: (): Promise<void> => {
        return invalidateChatbotSessions(queryClient);
      },
    },
  });
}

/**
 * Mutation hook for updating a session title
 */
export function useUpdateSessionTitle(): UpdateMutation<ChatbotSessionListItem, { sessionId: string; title: string }> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateChatbotSessionTitle(sessionId, title),
    options: {
      onSuccess: (_data: ChatbotSessionListItem, { sessionId }: { sessionId: string; title: string }): Promise<void> => {
        void invalidateChatbotSessions(queryClient);
        return invalidateChatbotSession(queryClient, sessionId);
      },
    },
  });
}

/**
 * Mutation hook for deleting a single session
 */
export function useDeleteChatbotSession(): UpdateMutation<unknown, string> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: deleteChatbotSession,
    options: {
      onSuccess: (_data: unknown, sessionId: string): void => {
        void invalidateChatbotSessions(queryClient);
        queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
      },
    },
  });
}

/**
 * Mutation hook for deleting multiple sessions
 */
export function useDeleteChatbotSessions(): UpdateMutation<unknown, string[]> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: deleteChatbotSessions,
    options: {
      onSuccess: (_data: unknown, sessionIds: string[]): Promise<void> => {
        void invalidateChatbotSessions(queryClient);
        sessionIds.forEach((id: string): void => {
          queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(id) });
        });
        return Promise.resolve();
      },
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

  return createUpdateMutation({
    mutationFn: ({ sessionId, role, content }: PersistSessionMessageVariables): Promise<void> =>
      persistSessionMessage(sessionId, role, content),
    options: {
      onSuccess: (_data: void, { sessionId }: PersistSessionMessageVariables): Promise<void> => {
        return invalidateChatbotSession(queryClient, sessionId);
      },
    },
  });
}

/**
 * Mutation hook for sending a chat message
 */
export function useSendChatMessage(): UpdateMutation<{ message?: string }, { messages: ChatMessage[]; model: string; sessionId?: string | null }> {
  return createUpdateMutation({
    mutationFn: sendChatbotMessage,
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

  return createUpdateMutation({
    mutationFn: ({ key, settings }: SaveChatbotSettingsVariables): Promise<{ settings?: { settings?: ChatbotSettingsPayload } }> =>
      saveChatbotSettings(key, settings),
    options: {
      onSuccess: (_data: { settings?: { settings?: ChatbotSettingsPayload } }, { key }: SaveChatbotSettingsVariables): Promise<void> => {
        return invalidateSettingsScope(queryClient, key);
      },
    },
  });
}
