'use client';

 
 

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { ProductImageSlot } from '@/features/products/types/products-ui';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type { ProductAiJob } from '@/shared/types/jobs';

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
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Mutation for enqueuing description generation job
  const enqueueMutation = useMutation({
    mutationFn: async (payload: { productId: string; type: string; payload: Record<string, unknown> }): Promise<{ jobId: string }> => {
      const enqueueRes = await fetch('/api/products/ai-jobs/enqueue', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const enqueueData = (await enqueueRes.json()) as { error?: string; jobId?: string };
      if (!enqueueRes.ok) throw new Error(enqueueData.error || 'Failed to enqueue generation job.');
      if (!enqueueData.jobId) throw new Error('Job ID not received from enqueue.');
      return { jobId: enqueueData.jobId };
    },
    onSuccess: async ({ jobId }) => {
      // Poll for job status
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 30) {
        await new Promise((r: (value: void | PromiseLike<void>) => void) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
        if (!statusRes.ok) break;
        const { job } = (await statusRes.json()) as { job: ProductAiJob };

        if (job.status === 'completed') {
          const description = job.result?.description;
          if (typeof description === 'string') {
            onSuccess(description);
          }
          completed = true;
        } else if (job.status === 'failed') {
          throw new Error(job.errorMessage || 'Generation failed.');
        }
        attempts++;
      }
      if (!completed) throw new Error('Generation is taking longer than expected. Check Job Queue.');
    },
    onError: (error: Error) => {
      onError(error.message);
    },
    onSettled: () => {
      setGenerating(false);
      // Invalidate relevant queries to refetch data after job completion
      void queryClient.invalidateQueries({ queryKey: ['productAiJobs'] });
    },
  });

  // Mutation for direct description generation (for unsaved products)
  const directGenerateMutation = useMutation({
    mutationFn: async (payload: { productData: Record<string, unknown>; imageUrls: string[] }): Promise<{ description: string }> => {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const resPayload = (await res.json()) as { error?: string; errorId?: string };
        throw new Error(resPayload?.error || 'Failed to generate description');
      }
      return (await res.json()) as { description: string };
    },
    onSuccess: ({ description }) => {
      onSuccess(description);
    },
    onError: (error: Error) => {
      onError(error.message);
    },
    onSettled: () => {
      setGenerating(false);
    },
  });

  const generate = async (productData: Record<string, unknown>, imageSlots: (ProductImageSlot | null)[]): Promise<void> => {
    setGenerating(true);
    const imageUrls = imageSlots
      .filter((slot: ProductImageSlot | null): slot is NonNullable<ProductImageSlot> => slot !== null)
      .map((slot) => (slot as NonNullable<ProductImageSlot>).previewUrl);

    try {
      if (productId) {
        await enqueueMutation.mutateAsync({
          productId,
          type: 'description_generation',
          payload: {},
        });
      } else {
        await directGenerateMutation.mutateAsync({ productData, imageUrls });
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to generate description.');
    } finally {
      setGenerating(false);
    }
  };

  return {
    generate,
    generating: generating || enqueueMutation.isPending || directGenerateMutation.isPending,
  };
}
