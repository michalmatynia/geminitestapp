"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ProductAiJob } from "@/shared/types/jobs";
import type { ProductJob } from "@/shared/types/listing-jobs";

export const jobKeys = {
  all: ["jobs"] as const,
  integrations: ["jobs", "integrations"] as const,
  productAi: ["jobs", "product-ai"] as const,
  chatbot: ["jobs", "chatbot"] as const,
};

export function useIntegrationJobs(): UseQueryResult<ProductJob[]> {
  return useQuery({
    queryKey: jobKeys.integrations,
    queryFn: async (): Promise<ProductJob[]> => {
      const res = await fetch("/api/integrations/jobs");
      if (!res.ok) throw new Error("Failed to load integration jobs");
      return (await res.json()) as ProductJob[];
    },
  });
}

export function useProductAiJobs(scope: string = "all"): UseQueryResult<{ jobs: ProductAiJob[] }> {
  return useQuery({
    queryKey: [...jobKeys.productAi, scope],
    queryFn: async (): Promise<{ jobs: ProductAiJob[] }> => {
      const res = await fetch(`/api/products/ai-jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load product AI jobs");
      return (await res.json()) as { jobs: ProductAiJob[] };
    },
    refetchInterval: 5000, // Refetch every 5 seconds for job status
    refetchIntervalInBackground: true,
  });
}

export function useChatbotJobs(scope: string = "all"): UseQueryResult<{ jobs: unknown[] }> {
  return useQuery({
    queryKey: [...jobKeys.chatbot, scope],
    queryFn: async (): Promise<{ jobs: unknown[] }> => {
      const res = await fetch(`/api/chatbot/jobs?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load chatbot jobs");
      return (await res.json()) as { jobs: unknown[] };
    },
  });
}
