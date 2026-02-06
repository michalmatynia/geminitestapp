
'use client';

import { useEffect } from 'react';

import type { ProductDto, ProductCategoryDto, ProductTagDto } from '@/shared/dtos';
import { useAdaptiveQuery } from '@/shared/hooks/query/useSmartCache';
import { useNormalizedQuery, useComposedQuery } from '@/shared/hooks/useQueryComposition';
import { useQueryScheduler, useBackgroundQueries } from '@/shared/hooks/useQueryScheduler';


interface EnhancedProductsQueryResult {
  products: ReturnType<typeof useNormalizedQuery<ProductDto>>;
  stats: any;
  selectById: (id: string) => ProductDto | undefined;
  selectMany: (ids: string[]) => ProductDto[];
}

// Enhanced product queries with normalization and composition
export function useEnhancedProducts(): EnhancedProductsQueryResult {
  const scheduler = useQueryScheduler();

  // Normalized products query
  const productsQuery = useNormalizedQuery<ProductDto>(
    ['products', 'enhanced'],
    async (): Promise<ProductDto[]> => {
      const res = await fetch('/api/products');
      return res.json() as Promise<ProductDto[]>;
    }
  );

  // Composed query for product statistics
  const productStats = useComposedQuery(
    {
      queryKey: ['products', 'enhanced'],
      queryFn: async (): Promise<ProductDto[]> => {
        const res = await fetch('/api/products');
        return res.json() as Promise<ProductDto[]>;
      },
    },
    (products: ProductDto[]): { total: number; published: number; categories: number; avgPrice: number; } => ({
      total: products.length,
      published: products.filter((p: ProductDto) => p.published).length,
      categories: [...new Set(products.map((p: ProductDto) => p.categoryId))].length,
      avgPrice: products.reduce((sum: number, p: ProductDto) => sum + (p.price || 0), 0) / products.length,
    })
  );

  // Schedule related queries
  useEffect((): void => {
    scheduler.scheduleQuery(
      'product-categories',
      ['products', 'categories'],
      async (): Promise<ProductCategoryDto[]> => {
        const catalogsRes = await fetch('/api/catalogs');
        if (!catalogsRes.ok) return [];
        type Catalog = { id: string };
        const catalogs = (await catalogsRes.json()) as Catalog[];
        const catalogId = Array.isArray(catalogs) && catalogs.length > 0 ? catalogs[0]?.id : undefined;
        if (!catalogId) return [];
        const res = await fetch(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        );
        if (!res.ok) return [];
        return res.json() as Promise<ProductCategoryDto[]>;
      },
      { priority: 'medium', delay: 2000 }
    );

    scheduler.scheduleQuery(
      'product-tags',
      ['products', 'tags'],
      async (): Promise<ProductTagDto[]> => {
        const res = await fetch('/api/products/tags');
        return res.json() as Promise<ProductTagDto[]>;
      },
      { priority: 'low', delay: 5000 }
    );
  }, [scheduler]);

  // Background sync for critical data
  useBackgroundQueries([
    {
      queryKey: ['products', 'count'],
      queryFn: async (): Promise<{ count: number }> => {
        const res = await fetch('/api/products/count');
        return res.json() as Promise<{ count: number }>;
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
export function useEnhancedUsers(): { users: ReturnType<typeof useAdaptiveQuery>; permissions: ReturnType<typeof useAdaptiveQuery>; activity: ReturnType<typeof useAdaptiveQuery>; } {
  // User list with long-term caching
  const users = useAdaptiveQuery(
    ['users', 'list'],
    async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
    { dataType: 'longTerm', priority: 'medium' }
  );

  // User permissions with standard caching
  const permissions = useAdaptiveQuery(
    ['users', 'permissions'],
    async () => {
      const res = await fetch('/api/users/permissions');
      return res.json();
    },
    { dataType: 'standard', priority: 'high' }
  );

  // User activity with real-time updates
  const activity = useAdaptiveQuery(
    ['users', 'activity'],
    async () => {
      const res = await fetch('/api/users/activity');
      return res.json();
    },
    { dataType: 'realtime', priority: 'low' }
  );

  return { users, permissions, activity };
}

// Enhanced settings with composition
export function useEnhancedSettings(): ReturnType<typeof useComposedQuery> {
  // Compose all settings into a single object
  const settings = useComposedQuery(
    {
      queryKey: ['settings', 'all'],
      queryFn: async () => {
        const [app, user, system] = await Promise.all([
          fetch('/api/settings/app').then(r => r.json()),
          fetch('/api/settings/user').then(r => r.json()),
          fetch('/api/settings/system').then(r => r.json()),
        ]);
        return { app, user, system };
      },
    },
    (data) => ({
      ...data.app,
      ...data.user,
      system: data.system,
      theme: data.user.theme || data.app.defaultTheme,
      language: data.user.language || data.app.defaultLanguage,
    })
  );

  return settings;
}
