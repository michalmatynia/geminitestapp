"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { ProductWithImages } from "@/features/products/types";
import type { DeleteResponse } from "@/shared/types/api";
import { delay } from "@/shared/utils";

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

export function useCreateProduct(): UseMutationResult<
  unknown,
  Error,
  FormData,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    onSuccess: async (): Promise<void> => {
      // Small delay to ensure DB consistency before refetch
      await delay(500);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  ProductWithImages,
  Error,
  UpdateProductPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: UpdateProductPayload): Promise<ProductWithImages> => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return (await response.json()) as ProductWithImages;
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useDeleteProduct(): UseMutationResult<
  DeleteResponse,
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      if (response.status === 204) {
        return { success: true };
      }
      const data = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!data) return { success: true };
      return { success: data.success !== false, message: data.message };
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}
