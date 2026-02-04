"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

export function useCsvImportMutation(): UseMutationResult<
  unknown,
  Error,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (loaded: number, total?: number) => void }): Promise<unknown> => {
      const formData = new FormData();
      formData.append("file", file);

      const { uploadWithProgress } = await import("@/shared/utils/upload-with-progress");
      const result = await uploadWithProgress<unknown>("/api/import", {
        formData,
        onProgress,
      });
      if (!result.ok) throw new Error("Failed to import CSV");
      return result.data;
    },
    onSuccess: () => {
      // Invalidate products as they might have been added/updated
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["products-count"] });
    },
  });
}
