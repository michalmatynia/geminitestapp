"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatbotMemoryItem } from "../types";

export const memoryKeys = {
  all: ["chatbot", "memory"] as const,
  list: (params: string) => ["chatbot", "memory", "list", params] as const,
};

export function useChatbotMemory(params: string = "") {
  return useQuery({
    queryKey: memoryKeys.list(params),
    queryFn: async (): Promise<ChatbotMemoryItem[]> => {
      const res = await fetch(`/api/chatbot/memory?${params}`);
      if (!res.ok) throw new Error("Failed to load memory");
      return res.json();
    },
  });
}

export function useDeleteMemoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/chatbot/memory/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete memory item");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}
