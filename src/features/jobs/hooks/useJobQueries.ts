"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ProductAiJob } from "@/shared/types/jobs";

export const jobKeys = {
  all: ["jobs"] as const,
  integrations: ["jobs", "integrations"] as const,
  productAi: ["jobs", "product-ai"] as const,
  chatbot: ["jobs", "chatbot"] as const,
};

export function useIntegrationJobs(): UseQueryResult<any[]> {
  return useQuery({
    queryKey: jobKeys.integrations,
    queryFn: async () => {
      const res = await fetch("/api/integrations/jobs");
      if (!res.ok) throw new Error("Failed to load integration jobs");
      return res.json();
    },
  });
}

export function useProductAiJobs(scope: string = "all"): UseQueryResult<{ jobs: ProductAiJob[] }> {
  return useQuery({
    queryKey: [...jobKeys.productAi, scope],
    queryFn: async () => {
      const res = await fetch(`/api/products/ai-jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load product AI jobs");
      return res.json();
    },
  });
}

export function useChatbotJobs(scope: string = "all"): UseQueryResult<{ jobs: any[] }> {
  return useQuery({
    queryKey: [...jobKeys.chatbot, scope],
    queryFn: async () => {
      const res = await fetch(`/api/chatbot/jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load chatbot jobs");
      return res.json();
    },
  });
}