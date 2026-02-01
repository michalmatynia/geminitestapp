"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { logKeys } from "./useLogQueries";

export function useClearLogsMutation(): UseMutationResult<boolean, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear logs.");
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });
}

export function useRebuildIndexesMutation(): UseMutationResult<any, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/diagnostics/mongo-indexes", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to rebuild Mongo indexes.");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: logKeys.diagnostics });
    },
  });
}
