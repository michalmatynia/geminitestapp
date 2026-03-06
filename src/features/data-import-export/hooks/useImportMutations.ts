'use client';

import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';
import type { CreateMutation } from '@/shared/contracts/ui';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCsvImportMutation(): CreateMutation<
  unknown,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
> {
  const mutationKey = QUERY_KEYS.products.all;
  return createMutationV2({
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
      const result = await uploadWithProgress<unknown>('/api/v2/products/import/csv', {
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
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}
