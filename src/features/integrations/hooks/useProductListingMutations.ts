"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import type { ImageTransformOptions } from "@/features/data-import-export";

export function useDeleteFromBaseMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }): Promise<Record<string, unknown>> => {
      const body: { inventoryId?: string } = inventoryId ? { inventoryId } : {};
      const res = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to delete from Base.com");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "product-listings", productId] });
    },
  });
}

export function usePurgeListingMutation(productId: string): UseMutationResult<
  void,
  Error,
  { listingId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }): Promise<void> => {
      const res = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}/purge`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to remove listing history");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "product-listings", productId] });
    },
  });
}

export function useUpdateListingInventoryIdMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { listingId: string; inventoryId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId: string }): Promise<Record<string, unknown>> => {
      const res = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId }),
        }
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to save inventory ID");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "product-listings", productId] });
    },
  });
}

export type ExportToBaseVariables = {
  connectionId: string;
  inventoryId: string;
  templateId?: string;
  imageBase64Mode?: "base-only" | "full-data-uri";
  imageTransform?: ImageTransformOptions | null;
  // For images only export
  imagesOnly?: boolean;
  listingId?: string;
  externalListingId?: string;
  exportImagesAsBase64?: boolean;
};

export function useExportToBaseMutation(productId: string): UseMutationResult<
  { logs?: CapturedLog[]; error?: string; skuExists?: boolean },
  Error,
  ExportToBaseVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExportToBaseVariables): Promise<{ logs?: CapturedLog[]; error?: string; skuExists?: boolean }> => {
      const res = await fetch(`/api/integrations/products/${productId}/export-to-base`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const payloadRes = (await res.json().catch(() => ({}))) as { logs?: CapturedLog[]; error?: string; skuExists?: boolean };
      
      if (!res.ok) {
        if (payloadRes.skuExists) {
           throw new Error(payloadRes.error || "SKU already exists in Base.com");
        }
        throw new Error(payloadRes.error || "Failed to export product");
      }
      return payloadRes;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "product-listings", productId] });
    },
  });
}

export function useCreateListingMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { integrationId: string; connectionId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }): Promise<Record<string, unknown>> => {
      const res = await fetch(`/api/integrations/products/${productId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId,
          connectionId,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to create listing");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "product-listings", productId] });
    },
  });
}