"use client";

import { useQuery } from "@tanstack/react-query";
import {
  chatbotQueryKeys,
  fetchChatbotSessions,
  fetchChatbotSession,
  fetchChatbotSettings,
  fetchOllamaModels,
  fetchChatbotMemory,
} from "../api";
import type { ChatSession } from "@/shared/types/chatbot";
import type { ChatbotSessionListItem } from "../types";

/**
 * Query hook for fetching all chatbot sessions
 */
export function useChatbotSessions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatbotQueryKeys.sessions(),
    queryFn: async () => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>();
      return data.sessions ?? [];
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching session IDs only (lightweight)
 */
export function useChatbotSessionIds(query?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...chatbotQueryKeys.sessions(), "ids", query ?? "all"],
    queryFn: async () => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>({
        scope: "ids",
        query,
      });
      return data.ids ?? [];
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching a single chatbot session with messages
 */
export function useChatbotSession(sessionId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sessionId ? chatbotQueryKeys.session(sessionId) : ["chatbot", "session", "none"],
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
export function useChatbotSettings(key?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatbotQueryKeys.settings(key),
    queryFn: () => fetchChatbotSettings(key),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching available models from the chatbot API
 */
export function useChatbotModels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatbotQueryKeys.models(),
    queryFn: async () => {
      const res = await fetch("/api/chatbot");
      if (!res.ok) {
        throw new Error("Failed to fetch models");
      }
      const data = (await res.json()) as { models?: string[] };
      return data.models ?? [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching Ollama models from a custom base URL
 */
export function useOllamaModels(baseUrl: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...chatbotQueryKeys.models(), "ollama", baseUrl],
    queryFn: () => fetchOllamaModels(baseUrl),
    enabled: (options?.enabled ?? true) && !!baseUrl,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Query hook for fetching chatbot memory/context
 */
export function useChatbotMemory(query?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatbotQueryKeys.memory(query),
    queryFn: () => fetchChatbotMemory(query),
    enabled: options?.enabled ?? true,
  });
}
