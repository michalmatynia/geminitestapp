import type {
  EcommerceProductBulkExportRequest,
  EcommerceProductBulkExportResponse,
  EcommerceProductExportResponse,
} from '@/shared/contracts/integrations/ecommerce-export';
import type { UpdateMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useExportProductToEcommerce(): UpdateMutation<
  EcommerceProductExportResponse,
  string
> {
  return createUpdateMutationV2({
    mutationFn: async (productId: string): Promise<EcommerceProductExportResponse> =>
      api.post<EcommerceProductExportResponse>(
        `/api/v2/integrations/products/${productId}/export-to-ecommerce`,
        {}
      ),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useExportProductToEcommerce',
      operation: 'create',
      resource: 'integrations.ecommerce.products.export',
      domain: 'integrations',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'integrations', 'ecommerce', 'export'],
      description: 'Exports one Product List product to the ecommerce product database.',
    },
  });
}

export function useBulkExportProductsToEcommerce(): UpdateMutation<
  EcommerceProductBulkExportResponse,
  EcommerceProductBulkExportRequest
> {
  return createUpdateMutationV2({
    mutationFn: async (
      request: EcommerceProductBulkExportRequest
    ): Promise<EcommerceProductBulkExportResponse> =>
      api.post<EcommerceProductBulkExportResponse>(
        '/api/v2/integrations/products/export-to-ecommerce/bulk',
        request
      ),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useBulkExportProductsToEcommerce',
      operation: 'create',
      resource: 'integrations.ecommerce.products.export.bulk',
      domain: 'integrations',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'integrations', 'ecommerce', 'export', 'bulk'],
      description: 'Exports selected Product List products to the ecommerce product database.',
    },
  });
}
