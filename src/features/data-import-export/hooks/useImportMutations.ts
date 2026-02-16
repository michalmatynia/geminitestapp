'use client';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';
import { createCreateMutation } from '@/shared/lib/query-factories-v2';
import type { CreateMutation } from '@/shared/types/query-result-types';

export function useCsvImportMutation(): CreateMutation<
  unknown,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (loaded: number, total?: number) => void }): Promise<unknown> => {
      const formData = new FormData();
      formData.append('file', file);

      const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
      const result = await uploadWithProgress<unknown>('/api/import', {
        formData,
        onProgress,
      });
      if (!result.ok) throw new Error('Failed to import CSV');
      return result.data;
    },
    options: {
      onSuccess: () => {
        // Invalidate products as they might have been added/updated
        void invalidateProductsAndCounts(queryClient);
      },
    },
  });
}
