import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/client";

export const agentRunsKeys = {
  all: ["agent-runs"] as const,
  lists: () => [...agentRunsKeys.all, "list"] as const,
  detail: (id: string) => [...agentRunsKeys.all, "detail", id] as const,
  snapshots: (id: string) => [...agentRunsKeys.detail(id), "snapshots"] as const,
  logs: (id: string) => [...agentRunsKeys.detail(id), "logs"] as const,
  audits: (id: string) => [...agentRunsKeys.detail(id), "audits"] as const,
};

export function useAgentRuns() {
  return useQuery({
    queryKey: agentRunsKeys.lists(),
    queryFn: api.getAgentRuns,
  });
}

export function useAgentSnapshots(runId: string | null) {
  return useQuery({
    queryKey: agentRunsKeys.snapshots(runId || ""),
    queryFn: () => api.getAgentSnapshots(runId!),
    enabled: !!runId,
  });
}

export function useAgentLogs(runId: string | null, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: agentRunsKeys.logs(runId || ""),
    queryFn: () => api.getAgentLogs(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useAgentAudits(runId: string | null, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: agentRunsKeys.audits(runId || ""),
    queryFn: () => api.getAgentAudits(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useDeleteAgentRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, force }: { runId: string; force?: boolean }) => 
      api.deleteAgentRun(runId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentRunsKeys.lists() });
    },
  });
}

export function useDeleteCompletedAgentRunsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCompletedAgentRuns,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentRunsKeys.lists() });
    },
  });
}
