'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { ProductRecord, ProductCategory, ProductTag } from '@/shared/contracts/products';
import { useAdaptiveQuery } from '@/shared/hooks/query/useSmartCache';
import { useNormalizedQuery, useComposedQuery } from '@/shared/hooks/useQueryComposition';
import { useQueryScheduler, useBackgroundQueries } from '@/shared/hooks/useQueryScheduler';
import { api } from '@/shared/lib/api-client';
import { productKeys, settingsKeys, authKeys } from '@/shared/lib/query-key-exports';

interface ProductStats {
  total: number;
  published: number;
  categories: number;
  avgPrice: number;
}

interface EnhancedProductsQueryResult {
  products: ReturnType<typeof useNormalizedQuery<ProductRecord>>;
  stats: ReturnType<typeof useComposedQuery<ProductRecord[], ProductStats>>;
  selectById: (id: string) => ProductRecord | undefined;
  selectMany: (ids: string[]) => ProductRecord[];
}

// Enhanced product queries with normalization and composition
export function useEnhancedProducts(): EnhancedProductsQueryResult {
  const scheduler = useQueryScheduler();

  // Normalized products query
  const productsQuery = useNormalizedQuery<ProductRecord>(
    productKeys.enhanced(),
    async (): Promise<ProductRecord[]> => {
      return await api.get<ProductRecord[]>('/api/v2/products');
    }
  );

  // Composed query for product statistics
  const productStats = useComposedQuery(
    {
      queryKey: productKeys.enhanced(),
      queryFn: async (): Promise<ProductRecord[]> => {
        return await api.get<ProductRecord[]>('/api/v2/products');
      },
    },
    (
      products: ProductRecord[]
    ): { total: number; published: number; categories: number; avgPrice: number } => ({
      total: products.length,
      published: products.filter((p: ProductRecord) => p.published).length,
      categories: [...new Set(products.map((p: ProductRecord) => p.categoryId))].length,
      avgPrice:
        products.reduce((sum: number, p: ProductRecord) => sum + (p.price || 0), 0) /
        products.length,
    })
  );

  // Schedule related queries
  useEffect((): void => {
    scheduler.scheduleQuery(
      'product-categories',
      productKeys.categoriesAll(),
      async (): Promise<ProductCategory[]> => {
        type Catalog = { id: string };
        const catalogs = await api.get<Catalog[]>('/api/catalogs');
        const catalogId =
          Array.isArray(catalogs) && catalogs.length > 0 ? catalogs[0]?.id : undefined;
        if (!catalogId) return [];
        return await api.get<ProductCategory[]>(
          `/api/v2/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        );
      },
      { priority: 'medium', delay: 2000 }
    );

    scheduler.scheduleQuery(
      'product-tags',
      productKeys.tagsAll(),
      async (): Promise<ProductTag[]> => {
        return await api.get<ProductTag[]>('/api/v2/products/tags');
      },
      { priority: 'low', delay: 5000 }
    );
  }, [scheduler]);

  // Background sync for critical data
  useBackgroundQueries([
    {
      queryKey: productKeys.enhancedCount(),
      queryFn: async (): Promise<{ count: number }> => {
        return await api.get<{ count: number }>('/api/v2/products/count');
      },
      interval: 60000, // 1 minute
    },
  ]);

  return {
    products: productsQuery,
    stats: productStats,
    selectById: productsQuery.selectById,
    selectMany: productsQuery.selectMany,
  };
}

// Enhanced user management with adaptive caching
export function useEnhancedUsers(): {
  users: UseQueryResult<unknown>;
  permissions: UseQueryResult<unknown>;
  activity: UseQueryResult<unknown>;
  } {
  // User list with long-term caching
  const users = useAdaptiveQuery(
    [...authKeys.users.all, 'list'],
    async () => await api.get('/api/users'),
    { dataType: 'longTerm', priority: 'medium' }
  );

  // User permissions with standard caching
  const permissions = useAdaptiveQuery(
    [...authKeys.users.all, 'permissions'],
    async () => await api.get('/api/users/permissions'),
    { dataType: 'standard', priority: 'high' }
  );

  // User activity with real-time updates
  const activity = useAdaptiveQuery(
    [...authKeys.users.all, 'activity'],
    async () => await api.get('/api/users/activity'),
    { dataType: 'realtime', priority: 'low' }
  );

  return { users, permissions, activity };
}

type SettingsObject = Record<string, unknown>;
type UserSettingsObject = SettingsObject & {
  theme?: string | null;
  language?: string | null;
};
type AppSettingsObject = SettingsObject & {
  defaultTheme?: string | null;
  defaultLanguage?: string | null;
};

// Enhanced settings with composition
export function useEnhancedSettings(): ReturnType<typeof useComposedQuery> {
  // Compose all settings into a single object
  const settings = useComposedQuery<
    { app: AppSettingsObject; user: UserSettingsObject; system: SettingsObject },
    SettingsObject & { system: SettingsObject; theme: string | null; language: string | null }
  >(
    {
      queryKey: settingsKeys.composed(),
      queryFn: async () => {
        const [app, user, system] = await Promise.all([
          api.get<AppSettingsObject>('/api/settings/app'),
          api.get<UserSettingsObject>('/api/settings/user'),
          api.get<SettingsObject>('/api/settings/system'),
        ]);
        return { app, user, system };
      },
    },
    (
      data
    ): SettingsObject & {
      system: SettingsObject;
      theme: string | null;
      language: string | null;
    } => ({
      ...data.app,
      ...data.user,
      system: data.system,
      theme: data.user.theme ?? data.app.defaultTheme ?? null,
      language: data.user.language ?? data.app.defaultLanguage ?? null,
    })
  );

  return settings;
}
