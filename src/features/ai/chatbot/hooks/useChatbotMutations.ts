'use client';

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';

import {
  invalidateChatbotSession,
  invalidateChatbotSessions,
  invalidateSettingsScope,
} from '@/shared/lib/query-invalidation';
import type { ChatMessage, ChatbotSettingsPayload, ChatSession } from '@/shared/types/domain/chatbot';

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
export function useCreateChatbotSession(): UseMutationResult<{ sessionId: string; session?: ChatSession }, Error, { title?: string; settings?: ChatSession['settings'] }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChatbotSession,
    onSuccess: (): Promise<void> => {
      return invalidateChatbotSessions(queryClient);
    },
  });
}

/**
 * Mutation hook for updating a session title
 */
export function useUpdateSessionTitle(): UseMutationResult<ChatbotSessionListItem, Error, { sessionId: string; title: string }> {
  const queryClient = useQueryClient();

  return useMutation<ChatbotSessionListItem, Error, { sessionId: string; title: string }>({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateChatbotSessionTitle(sessionId, title),
    onSuccess: (_data: ChatbotSessionListItem, { sessionId }: { sessionId: string; title: string }): Promise<void> => {
      void invalidateChatbotSessions(queryClient);
      return invalidateChatbotSession(queryClient, sessionId);
    },
  });
}

/**
 * Mutation hook for deleting a single session
 */
export function useDeleteChatbotSession(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatbotSession,
    onSuccess: (_data: unknown, sessionId: string): void => {
      void invalidateChatbotSessions(queryClient);
      queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for deleting multiple sessions
 */
export function useDeleteChatbotSessions(): UseMutationResult<unknown, Error, string[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatbotSessions,
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

export function usePersistSessionMessage(): UseMutationResult<void, Error, PersistSessionMessageVariables> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, PersistSessionMessageVariables>({
    mutationFn: ({ sessionId, role, content }: PersistSessionMessageVariables): Promise<void> =>
      persistSessionMessage(sessionId, role, content),
    onSuccess: (_data: void, { sessionId }: PersistSessionMessageVariables): Promise<void> => {
      return invalidateChatbotSession(queryClient, sessionId);
    },
  });
}

/**
 * Mutation hook for sending a chat message
 */
export function useSendChatMessage(): UseMutationResult<{ message?: string }, Error, { messages: ChatMessage[]; model: string; sessionId?: string | null }> {
  return useMutation({
    mutationFn: sendChatbotMessage,
  });
}

/**
 * Mutation hook for saving chatbot settings
 */
export function useSaveChatbotSettings(): UseMutationResult<
  { settings?: { settings?: ChatbotSettingsPayload } },
  Error,
  SaveChatbotSettingsVariables
  > {
  const queryClient = useQueryClient();

  return useMutation<{ settings?: { settings?: ChatbotSettingsPayload } }, Error, SaveChatbotSettingsVariables>({
    mutationFn: ({ key, settings }: SaveChatbotSettingsVariables): Promise<{ settings?: { settings?: ChatbotSettingsPayload } }> =>
      saveChatbotSettings(key, settings),
    onSuccess: (_data: { settings?: { settings?: ChatbotSettingsPayload } }, { key }: SaveChatbotSettingsVariables): Promise<void> => {
      return invalidateSettingsScope(queryClient, key);
    },  });
}
