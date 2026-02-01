"use client";

import { useState } from "react";
import type { ProductAiJob } from "@/shared/types/jobs";
import type { ProductImageSlot } from "@/features/products/types/products-ui";

interface UseDescriptionGenerationProps {
  productId?: string;
  onSuccess: (description: string) => void;
  onError: (error: string) => void;
}

interface UseDescriptionGenerationResult {
  generate: (productData: Record<string, unknown>, imageSlots: (ProductImageSlot | null)[]) => Promise<void>;
  generating: boolean;
}

export function useDescriptionGeneration({ productId, onSuccess, onError }: UseDescriptionGenerationProps): UseDescriptionGenerationResult {
  const [generating, setGenerating] = useState(false);

  const generate = async (productData: Record<string, unknown>, imageSlots: (ProductImageSlot | null)[]): Promise<void> => {
    setGenerating(true);
    const imageUrls = imageSlots
      .filter((slot: ProductImageSlot | null): slot is ProductImageSlot => slot !== null)
      .map((slot: ProductImageSlot) => slot.previewUrl);

    try {
      if (productId) {
        // Enqueue job
        const enqueueRes = await fetch("/api/products/ai-jobs/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            type: "description_generation",
            payload: {} 
          }),
        });

        const enqueueData = (await enqueueRes.json()) as { error?: string; jobId?: string };
        if (!enqueueRes.ok) throw new Error(enqueueData.error || "Failed to enqueue generation job.");
        const jobId = enqueueData.jobId;

        // Poll for status
        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 30) {
          await new Promise((r: (value: void | PromiseLike<void>) => void) => setTimeout(r, 2000));
          const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
          if (!statusRes.ok) break;
          const { job } = (await statusRes.json()) as { job: ProductAiJob };

          if (job.status === "completed") {
            const description = job.result?.description;
            if (typeof description === "string") {
              onSuccess(description);
            }
            completed = true;
          } else if (job.status === "failed") {
            throw new Error(job.errorMessage || "Generation failed.");
          }
          attempts++;
        }
        if (!completed) throw new Error("Generation is taking longer than expected. Check the AI Jobs page.");
      } else {
        // Direct generation for unsaved products
        const res = await fetch("/api/generate-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productData, imageUrls }),
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          throw new Error(payload?.error || "Failed to generate description");
        }
        const { description } = (await res.json()) as { description: string };
        onSuccess(description);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  return {
    generate,
    generating,
  };
}