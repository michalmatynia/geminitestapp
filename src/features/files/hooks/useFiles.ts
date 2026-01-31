"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpandedImageFile } from "@/features/products";

const fileKeys = {
  all: ["files"] as const,
  list: (params: string) => ["files", "list", params] as const,
};

export function useFiles(params: string = "") {
  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: async () => {
      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) throw new Error("Failed to load files");
      return (await res.json()) as ExpandedImageFile[];
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete file");
      return fileId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export function useUpdateFileTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const res = await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error("Failed to update file tags");
      return (await res.json()) as ExpandedImageFile;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
