import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

export interface AiConfig {
  imageAnalysisModel: string;
  visionInputPrompt: string;
  visionOutputPrompt: string;
  visionOutputEnabled: boolean;
  descriptionGenerationModel: string;
  generationInputPrompt: string;
  generationOutputPrompt: string;
  generationOutputEnabled: boolean;
  testProductId?: string;
}

// Query Keys
export const aiConfigKeys = {
  all: ["ai-config"] as const,
};

// API Functions
async function fetchAiConfig(): Promise<AiConfig> {
  const res = await fetch("/api/ai-config");
  if (!res.ok) throw new Error("Failed to load AI configuration");
  return (await res.json()) as AiConfig;
}

async function updateAiConfig(config: Partial<AiConfig>): Promise<AiConfig> {
  const res = await fetch("/api/ai-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update AI configuration");
  return (await res.json()) as AiConfig;
}

// Query Hooks
export function useAiConfig(): UseQueryResult<AiConfig> {
  return useQuery({
    queryKey: aiConfigKeys.all,
    queryFn: fetchAiConfig,
  });
}

// Mutation Hooks
export function useUpdateAiConfigMutation(): UseMutationResult<AiConfig, Error, Partial<AiConfig>> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAiConfig,
    onSuccess: (updatedConfig: AiConfig) => {
      queryClient.setQueryData(aiConfigKeys.all, updatedConfig);
    },
  });
}
