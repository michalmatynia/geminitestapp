"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  chatbotQueryKeys,
  createChatbotSession,
  updateChatbotSessionTitle,
  deleteChatbotSession,
  deleteChatbotSessions,
  persistSessionMessage,
  sendChatbotMessage,
  saveChatbotSettings,
} from "../api";
import type { ChatMessage, ChatbotSettingsPayload } from "@/shared/types/chatbot";

/**
 * Mutation hook for creating a new chatbot session
 */
export function useCreateChatbotSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChatbotSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.sessions() });
    },
  });
}

/**
 * Mutation hook for updating a session title
 */
export function useUpdateSessionTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateChatbotSessionTitle(sessionId, title),
    onSuccess: (_, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for deleting a single session
 */
export function useDeleteChatbotSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatbotSession,
    onSuccess: (_, sessionId) => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.sessions() });
      queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for deleting multiple sessions
 */
export function useDeleteChatbotSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatbotSessions,
    onSuccess: (_, sessionIds) => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.sessions() });
      sessionIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: chatbotQueryKeys.session(id) });
      });
    },
  });
}

/**
 * Mutation hook for persisting a message to a session
 */
export function usePersistSessionMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      role,
      content,
    }: {
      sessionId: string;
      role: ChatMessage["role"];
      content: string;
    }) => persistSessionMessage(sessionId, role, content),
    onSuccess: (_, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.session(sessionId) });
    },
  });
}

/**
 * Mutation hook for sending a chat message
 */
export function useSendChatMessage() {
  return useMutation({
    mutationFn: sendChatbotMessage,
  });
}

/**
 * Mutation hook for saving chatbot settings
 */
export function useSaveChatbotSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, settings }: { key: string; settings: ChatbotSettingsPayload }) =>
      saveChatbotSettings(key, settings),
    onSuccess: (_, { key }) => {
      void queryClient.invalidateQueries({ queryKey: chatbotQueryKeys.settings(key) });
    },
  });
}
