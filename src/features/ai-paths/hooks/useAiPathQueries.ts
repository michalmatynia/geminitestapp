"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { runsApi } from "@/features/ai-paths/lib";
import type { AiPathRunRecord, AiPathRunNodeRecord, AiPathRunEventRecord } from "@/shared/types/ai-paths";

export const aiPathKeys = {
  all: ["ai-paths"] as const,
  deadLetter: (filters: any) => [...aiPathKeys.all, "dead-letter", filters] as const,
  run: (runId: string) => [...aiPathKeys.all, "runs", runId] as const,
};

export function useAiPathDeadLetterRuns(filters: { status: string; pathId?: string; query?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: aiPathKeys.deadLetter(filters),
    queryFn: async () => {
      const response = await runsApi.list(filters);
      if (!response.ok) throw new Error(response.error || "Failed to load dead-letter runs");
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
  });
}

export function useAiPathRunDetail(runId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: aiPathKeys.run(runId),
    queryFn: async () => {
      const response = await runsApi.get(runId);
      if (!response.ok) throw new Error(response.error || "Failed to load run details");
      return response.data as { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] };
    },
    enabled: enabled && !!runId,
  });
}

export function useAiPathRequeueMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { runIds?: string[]; pathId?: string | null; query?: string | null; mode: "resume" | "replay" }) => {
      const response = await runsApi.requeueDeadLetter(params);
      if (!response.ok) throw new Error(response.error || "Failed to requeue runs");
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}

export function useAiPathResumeMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ runId, mode }: { runId: string; mode: "resume" | "replay" }) => {
      const response = await runsApi.resume(runId, mode);
      if (!response.ok) throw new Error(response.error || "Failed to resume run");
      return response.data;
    },
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}

export function useAiPathRetryNodeMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ runId, nodeId }: { runId: string; nodeId: string }) => {
      const response = await runsApi.retryNode(runId, nodeId);
      if (!response.ok) throw new Error(response.error || "Failed to retry node");
      return response.data;
    },
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: aiPathKeys.all });
    },
  });
}
