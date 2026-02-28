'use client';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';
import type { CreateMutation } from '@/shared/contracts/ui';
import { createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCsvImportMutation(): CreateMutation<
  unknown,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.products.all;
  return createCreateMutationV2({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }): Promise<unknown> => {
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
    mutationKey,
    meta: {
      source: 'importExport.hooks.useCsvImportMutation',
      operation: 'upload',
      resource: 'products.import.csv',
      domain: 'products',
      mutationKey,
      tags: ['products', 'import', 'csv'],
    },
    onSuccess: () => {
      // Invalidate products as they might have been added/updated
      void invalidateProductsAndCounts(queryClient);
    },
  });
}
