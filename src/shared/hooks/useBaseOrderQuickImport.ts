import type { BaseOrderImportQuickImportPayload, BaseOrderImportQuickImportResponse } from '@/shared/contracts/products/orders-import';
import type { MutationResult } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { productKeys } from '@/shared/lib/query-key-exports';

const productOrdersImportKeys = {
  all: [...productKeys.all, 'orders-import'] as const,
  quickImport: () => [...productOrdersImportKeys.all, 'quick-import'] as const,
};

export function useQuickImportBaseOrdersMutation(): MutationResult<
  BaseOrderImportQuickImportResponse,
  BaseOrderImportQuickImportPayload
> {
  const mutationKey = productOrdersImportKeys.quickImport();
  return createMutationV2({
    mutationFn: (payload) =>
      api.post<BaseOrderImportQuickImportResponse>(
        '/api/v2/products/orders-import/quick-import',
        payload
      ),
    mutationKey,
    meta: {
      source: 'shared.hooks.useQuickImportBaseOrdersMutation',
      operation: 'action',
      resource: 'products.orders-import.quick-import',
      domain: 'products',
      mutationKey,
      tags: ['products', 'orders-import', 'quick-import'],
      description: 'Fetches and imports new or changed Base.com orders in one server action.',
    },
  });
}
