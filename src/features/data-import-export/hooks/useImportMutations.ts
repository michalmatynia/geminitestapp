"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

export function useCsvImportMutation(): UseMutationResult<unknown, Error, File> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<unknown> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to import CSV");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate products as they might have been added/updated
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["products-count"] });
    },
  });
}
