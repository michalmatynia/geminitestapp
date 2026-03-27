'use client';

import type {
  BaseOrderImportPersistPayload,
  BaseOrderImportPersistResponse,
  BaseOrderImportPreviewPayload,
  BaseOrderImportPreviewResponse,
  BaseOrderImportQuickImportPayload,
  BaseOrderImportQuickImportResponse,
  BaseOrderImportStatusOption,
} from '@/shared/contracts/products';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { productKeys } from '@/shared/lib/query-key-exports';

const productOrdersImportKeys = {
  all: [...productKeys.all, 'orders-import'] as const,
  statuses: (connectionId: string | null) =>
    [...productOrdersImportKeys.all, 'statuses', connectionId ?? 'none'] as const,
  preview: () => [...productOrdersImportKeys.all, 'preview'] as const,
  import: () => [...productOrdersImportKeys.all, 'import'] as const,
  quickImport: () => [...productOrdersImportKeys.all, 'quick-import'] as const,
};

export function useBaseOrderImportStatuses(connectionId: string): ListQuery<BaseOrderImportStatusOption> {
  const queryKey = productOrdersImportKeys.statuses(connectionId || null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<BaseOrderImportStatusOption[]> => {
      if (!connectionId.trim()) return [];
      const response = await api.get<{ statuses: BaseOrderImportStatusOption[] }>(
        '/api/v2/products/orders-import/statuses',
        { params: { connectionId } }
      );
      return response.statuses ?? [];
    },
    enabled: Boolean(connectionId.trim()),
    staleTime: 5 * 60 * 1_000,
    meta: {
      source: 'products.hooks.useBaseOrderImportStatuses',
      operation: 'list',
      resource: 'products.orders-import.statuses',
      domain: 'products',
      queryKey,
      tags: ['products', 'orders-import', 'statuses'],
      description: 'Loads available Base.com order statuses for the selected connection.',
    },
  });
}

export function usePreviewBaseOrdersMutation(): MutationResult<
  BaseOrderImportPreviewResponse,
  BaseOrderImportPreviewPayload
> {
  const mutationKey = productOrdersImportKeys.preview();
  return createMutationV2({
    mutationFn: (payload) =>
      api.post<BaseOrderImportPreviewResponse>('/api/v2/products/orders-import/preview', payload),
    mutationKey,
    meta: {
      source: 'products.hooks.usePreviewBaseOrdersMutation',
      operation: 'action',
      resource: 'products.orders-import.preview',
      domain: 'products',
      mutationKey,
      tags: ['products', 'orders-import', 'preview'],
      description: 'Fetches and normalizes Base.com orders for preview before import.',
    },
  });
}

export function useImportBaseOrdersMutation(): MutationResult<
  BaseOrderImportPersistResponse,
  BaseOrderImportPersistPayload
> {
  const mutationKey = productOrdersImportKeys.import();
  return createMutationV2({
    mutationFn: (payload) =>
      api.post<BaseOrderImportPersistResponse>('/api/v2/products/orders-import/import', payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useImportBaseOrdersMutation',
      operation: 'action',
      resource: 'products.orders-import.import',
      domain: 'products',
      mutationKey,
      tags: ['products', 'orders-import', 'import'],
      description: 'Persists selected Base.com orders in local admin storage.',
    },
  });
}

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
      source: 'products.hooks.useQuickImportBaseOrdersMutation',
      operation: 'action',
      resource: 'products.orders-import.quick-import',
      domain: 'products',
      mutationKey,
      tags: ['products', 'orders-import', 'quick-import'],
      description: 'Fetches and imports new or changed Base.com orders in one server action.',
    },
  });
}
