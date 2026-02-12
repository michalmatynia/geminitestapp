import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  invalidateCatalogScopedData,
  invalidateCatalogs,
  invalidateIntegrationConnections,
  invalidateProductMetadata,
  invalidateUserPreferences,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

describe('query invalidation helpers', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);

  const queryClient = {
    invalidateQueries,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates product metadata namespace', async () => {
    await invalidateProductMetadata(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.all,
    });
  });

  it('invalidates metadata catalogs key', async () => {
    await invalidateCatalogs(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.catalogs,
    });
  });

  it('invalidates all catalog-scoped metadata keys', async () => {
    await invalidateCatalogScopedData(queryClient as never, 'cat-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: QUERY_KEYS.products.metadata.categories('cat-1'),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: QUERY_KEYS.products.metadata.tags('cat-1'),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: QUERY_KEYS.products.metadata.parameters('cat-1'),
    });
  });

  it('invalidates both user preferences key namespaces', async () => {
    await invalidateUserPreferences(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: QUERY_KEYS.auth.preferences.all,
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: QUERY_KEYS.userPreferences,
    });
  });

  it('invalidates integration connections root key when no integration id is provided', async () => {
    await invalidateIntegrationConnections(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections(),
    });
  });

  it('invalidates both integration connections root and scoped keys', async () => {
    await invalidateIntegrationConnections(queryClient as never, 'int-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: QUERY_KEYS.integrations.connections(),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: [...QUERY_KEYS.integrations.connections(), 'int-1'],
    });
  });
});
