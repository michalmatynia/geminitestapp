"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductWithImages } from "@/features/products/types";
import type { DeleteResponse } from "@/shared/types/api";
import { delay } from "@/shared/utils";

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    onSuccess: async () => {
      // Small delay to ensure DB consistency before refetch
      await delay(500);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateProductPayload) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return (await response.json()) as ProductWithImages;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}
