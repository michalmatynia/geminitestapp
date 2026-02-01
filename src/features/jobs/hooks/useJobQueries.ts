"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ProductAiJob } from "@/shared/types/jobs";

export const jobKeys = {
  all: ["jobs"] as const,
  integrations: ["jobs", "integrations"] as const,
  productAi: ["jobs", "product-ai"] as const,
  chatbot: ["jobs", "chatbot"] as const,
};

export function useIntegrationJobs(): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: jobKeys.integrations,
    queryFn: async (): Promise<unknown[]> => {
      const res = await fetch("/api/integrations/jobs");
      if (!res.ok) throw new Error("Failed to load integration jobs");
      return res.json() as Promise<unknown[]>;
    },
  });
}

export function useProductAiJobs(scope: string = "all"): UseQueryResult<{ jobs: ProductAiJob[] }> {
  return useQuery({
    queryKey: [...jobKeys.productAi, scope],
    queryFn: async (): Promise<{ jobs: ProductAiJob[] }> => {
      const res = await fetch(`/api/products/ai-jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load product AI jobs");
      return res.json() as Promise<{ jobs: ProductAiJob[] }>;
    },
  });
}

export function useChatbotJobs(scope: string = "all"): UseQueryResult<{ jobs: unknown[] }> {
  return useQuery({
    queryKey: [...jobKeys.chatbot, scope],
    queryFn: async (): Promise<{ jobs: unknown[] }> => {
      const res = await fetch(`/api/chatbot/jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load chatbot jobs");
      return res.json() as Promise<{ jobs: unknown[] }>;
    },
  });
}
