"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { ChatSession } from "@/shared/types/chatbot";
import {
  chatbotQueryKeys,
  fetchChatbotSessions,
  fetchChatbotSession,
  fetchChatbotSettings,
  fetchOllamaModels,
  fetchChatbotMemory,
} from "../api";
import type { ChatbotSessionListItem } from "../types";

/**
 * Query hook for fetching all chatbot sessions
 */
export function useChatbotSessions(options?: { enabled?: boolean }): UseQueryResult<ChatbotSessionListItem[]> {
  return useQuery({
    queryKey: chatbotQueryKeys.sessions(),
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
    queryKey: [...chatbotQueryKeys.sessions(), "ids", query ?? "all"],
    queryFn: async (): Promise<string[]> => {
      const data = await fetchChatbotSessions<ChatbotSessionListItem>({
        scope: "ids",
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
export function useChatbotSettings(key?: string, options?: { enabled?: boolean }): UseQueryResult<{ settings?: { settings?: unknown } | null }> {
  return useQuery({
    queryKey: chatbotQueryKeys.settings(key),
    queryFn: (): Promise<{ settings?: { settings?: unknown } | null }> => key ? fetchChatbotSettings(key) : Promise.resolve({ settings: null }),
    enabled: (options?.enabled ?? true) && !!key,
  });
}

/**
 * Query hook for fetching available models from the chatbot API
 */
export function useChatbotModels(options?: { enabled?: boolean }): UseQueryResult<string[]> {
  return useQuery({
    queryKey: chatbotQueryKeys.models(),
    queryFn: async (): Promise<string[]> => {
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
export function useOllamaModels(baseUrl: string, options?: { enabled?: boolean }): UseQueryResult<string[]> {
  return useQuery({
    queryKey: [...chatbotQueryKeys.models(), "ollama", baseUrl],
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
    queryKey: chatbotQueryKeys.memory(query),
    queryFn: (): Promise<unknown> => fetchChatbotMemory(query ?? ""),
    enabled: options?.enabled ?? true,
  });
}
