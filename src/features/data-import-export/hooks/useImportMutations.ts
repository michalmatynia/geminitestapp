import type { ProductCsvImportResponse } from '@/shared/contracts/products';
import type { CreateMutation } from '@/shared/contracts/ui';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductsAndCounts } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCsvImportMutation(): CreateMutation<
  ProductCsvImportResponse,
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
    }): Promise<ProductCsvImportResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
      const result = await uploadWithProgress<ProductCsvImportResponse>(
        '/api/v2/products/import/csv',
        {
          formData,
          onProgress,
        }
      );
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
      description: 'Uploads products import csv.'},
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}
