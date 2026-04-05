import type {
  ChatbotChatResponseDto,
  ChatbotSessionCreateResponse,
  ChatbotSessionDeleteResponse,
  ChatbotSettingsDto as ChatbotSettingsPayload,
  ChatbotSessionDto as ChatSession,
  ChatbotSessionListItem,
} from '@/shared/contracts/chatbot';
import type { CreateMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateChatbotSession,
  invalidateChatbotSessions,
  invalidateSettingsScope,
} from '@/shared/lib/query-invalidation';

import {
  chatbotQueryKeys,
  createChatbotSession,
  updateChatbotSessionTitle,
  deleteChatbotSession,
  deleteChatbotSessions,
  sendChatbotMessage,
  saveChatbotSettings,
} from '../api';

/**
 * Mutation hook for creating a new chatbot session
 */
export function useCreateChatbotSession(): CreateMutation<
  ChatbotSessionCreateResponse,
  { title?: string; settings?: ChatSession['settings'] }
  > {
  const mutationKey = chatbotQueryKeys.mutation('create-session');

  return createCreateMutationV2({
    mutationFn: createChatbotSession,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useCreateChatbotSession',
      operation: 'create',
      resource: 'chatbot.sessions',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'sessions', 'create'],
      description: 'Creates chatbot sessions.'},
    invalidate: (queryClient) => invalidateChatbotSessions(queryClient),
  });
}

/**
 * Mutation hook for updating a session title
 */
export function useUpdateSessionTitle(): UpdateMutation<
  ChatbotSessionListItem,
  { sessionId: string; title: string }
  > {
  const mutationKey = chatbotQueryKeys.mutation('update-session-title');

  return createUpdateMutationV2({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateChatbotSessionTitle(sessionId, title),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useUpdateSessionTitle',
      operation: 'update',
      resource: 'chatbot.sessions.title',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'sessions', 'update-title'],
      description: 'Updates chatbot sessions title.'},
    invalidate: (queryClient, _data, { sessionId }) => {
      void invalidateChatbotSessions(queryClient);
      return invalidateChatbotSession(queryClient, sessionId);
    },
  });
}

/**
 * Mutation hook for deleting a single session
 */
export function useDeleteChatbotSession(): UpdateMutation<ChatbotSessionDeleteResponse, string> {
  const mutationKey = chatbotQueryKeys.mutation('delete-session');

  return createDeleteMutationV2({
    mutationFn: deleteChatbotSession,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useDeleteChatbotSession',
      operation: 'delete',
      resource: 'chatbot.sessions',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'sessions', 'delete'],
      description: 'Deletes chatbot sessions.'},
    invalidate: (queryClient, _data, sessionId) => {
      void invalidateChatbotSessions(queryClient);
      queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for deleting multiple sessions
 */
export function useDeleteChatbotSessions(): UpdateMutation<ChatbotSessionDeleteResponse, string[]> {
  const mutationKey = chatbotQueryKeys.mutation('delete-sessions');

  return createDeleteMutationV2({
    mutationFn: deleteChatbotSessions,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useDeleteChatbotSessions',
      operation: 'delete',
      resource: 'chatbot.sessions.bulk',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'sessions', 'bulk-delete'],
      description: 'Deletes chatbot sessions bulk.'},
    invalidate: (queryClient, _data, sessionIds) => {
      void invalidateChatbotSessions(queryClient);
      sessionIds.forEach((id: string): void => {
        queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(id) });
      });
    },
  });
}

type SaveChatbotSettingsVariables = {
  key: string;
  settings: ChatbotSettingsPayload;
};

/**
 * Mutation hook for sending a chat message
 */
export function useSendChatMessage(): UpdateMutation<
  ChatbotChatResponseDto,
  Parameters<typeof sendChatbotMessage>[0]
  > {
  const mutationKey = chatbotQueryKeys.mutation('send-message');
  return createUpdateMutationV2({
    mutationFn: sendChatbotMessage,
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSendChatMessage',
      operation: 'action',
      resource: 'chatbot.messages',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'messages', 'send'],
      description: 'Runs chatbot messages.'},
  });
}

/**
 * Mutation hook for saving chatbot settings
 */
export function useSaveChatbotSettings(): UpdateMutation<
  { settings?: { settings?: ChatbotSettingsPayload } },
  SaveChatbotSettingsVariables
  > {
  const mutationKey = chatbotQueryKeys.mutation('save-settings');

  return createUpdateMutationV2({
    mutationFn: ({
      key,
      settings,
    }: SaveChatbotSettingsVariables): Promise<{
      settings?: { settings?: ChatbotSettingsPayload };
    }> => saveChatbotSettings(key, settings),
    mutationKey,
    meta: {
      source: 'chatbot.hooks.useSaveChatbotSettings',
      operation: 'update',
      resource: 'chatbot.settings',
      domain: 'chatbot',
      mutationKey,
      tags: ['chatbot', 'settings', 'save'],
      description: 'Updates chatbot settings.'},
    invalidate: (queryClient, _data, { key }) => invalidateSettingsScope(queryClient, key),
  });
}
