import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type {
  ProductCategory,
  ProductCategoryCreateInput,
  ProductCategoryUpdateInput,
  ReorderProductCategory as ReorderCategoryPayload,
} from '@/shared/contracts/products/categories';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { DeleteMutation, SaveMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import { createDeleteMutationV2, createMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateCatalogScopedData,
  invalidatePriceGroups,
  invalidateProductSettingsCatalogs,
} from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';
import { hasPersistedId, requireTrimmedString } from './useProductSettingsQueries.shared';

type SaveCategoryPayload = {
  id: string | undefined;
  data: Partial<ProductCategory>;
};

type SaveTagPayload = {
  id: string | undefined;
  data: Partial<ProductTag>;
};

const toCategoryUpdatePayload = (
  data: Partial<ProductCategory>
): ProductCategoryUpdateInput => {
  const payload: ProductCategoryUpdateInput = {};
  const assignDefined = <TKey extends keyof ProductCategoryUpdateInput>(
    key: TKey,
    value: ProductCategoryUpdateInput[TKey] | undefined
  ): void => {
    if (value !== undefined) payload[key] = value;
  };
  const assignNonNullish = <TKey extends keyof ProductCategoryUpdateInput>(
    key: TKey,
    value: ProductCategoryUpdateInput[TKey] | null | undefined
  ): void => {
    if (value !== undefined && value !== null) payload[key] = value;
  };

  assignDefined('name', data.name);
  assignDefined('name_pl', data.name_pl);
  assignDefined('description', data.description);
  assignDefined('color', data.color);
  assignDefined('parentId', data.parentId);
  assignDefined('catalogId', data.catalogId);
  assignNonNullish('sortIndex', data.sortIndex);

  return payload;
};

const toCategoryCreatePayload = (
  data: Partial<ProductCategory>
): ProductCategoryCreateInput => ({
  ...toCategoryUpdatePayload(data),
  name: requireTrimmedString(data.name, 'Category name is required'),
  catalogId: requireTrimmedString(data.catalogId, 'Category catalogId is required'),
});

export function useUpdatePriceGroupMutation(): UpdateMutation<PriceGroup, PriceGroup> {
  const mutationKey = productSettingsKeys.priceGroups();
  return createUpdateMutationV2({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdatePriceGroupMutation',
      operation: 'update',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'update'],
      description: 'Updates products settings price groups.',
    },
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation {
  const mutationKey = productSettingsKeys.priceGroups();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeletePriceGroupMutation',
      operation: 'delete',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'delete'],
      description: 'Deletes products settings price groups.',
    },
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  const mutationKey = productSettingsKeys.priceGroups();
  return createMutationV2({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) =>
      api.savePriceGroup(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSavePriceGroupMutation',
      operation: 'action',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'save'],
      description: 'Runs products settings price groups.',
    },
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
  const mutationKey = productSettingsKeys.catalogs();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deleteCatalog(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteCatalogMutation',
      operation: 'delete',
      resource: 'products.settings.catalogs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'catalogs', 'delete'],
      description: 'Deletes products settings catalogs.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
  const mutationKey = productSettingsKeys.catalogs();
  return createMutationV2({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) => {
      if (hasPersistedId(id)) return api.updateCatalog(id, data);
      return api.createCatalog(data);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveCatalogMutation',
      operation: 'action',
      resource: 'products.settings.catalogs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'catalogs', 'save'],
      description: 'Runs products settings catalogs.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<ProductCategory, SaveCategoryPayload> {
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: SaveCategoryPayload) => {
      if (hasPersistedId(id)) return api.updateCategory(id, toCategoryUpdatePayload(data));
      return api.createCategory(toCategoryCreatePayload(data));
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveCategoryMutation',
      operation: 'action',
      resource: 'products.settings.categories',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'save'],
      description: 'Runs products settings categories.',
    },
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
> {
  const mutationKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteCategoryMutation',
      operation: 'delete',
      resource: 'products.settings.categories',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'delete'],
      description: 'Deletes products settings categories.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<
  ProductCategory,
  ReorderCategoryPayload
> {
  const mutationKey = productSettingsKeys.all;
  return createUpdateMutationV2({
    mutationFn: (payload: ReorderCategoryPayload) => api.reorderCategory(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useReorderCategoryMutation',
      operation: 'update',
      resource: 'products.settings.categories.reorder',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'reorder'],
      description: 'Updates products settings categories reorder.',
    },
    invalidate: (queryClient, _data, variables) => {
      const catalogId = variables.catalogId ?? null;
      return invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation(): SaveMutation<ProductTag, SaveTagPayload> {
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: SaveTagPayload) => {
      if (hasPersistedId(id)) return api.updateTag(id, data);
      return api.createTag(data);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveTagMutation',
      operation: 'action',
      resource: 'products.settings.tags',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'tags', 'save'],
      description: 'Runs products settings tags.',
    },
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
> {
  const mutationKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteTagMutation',
      operation: 'delete',
      resource: 'products.settings.tags',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'tags', 'delete'],
      description: 'Deletes products settings tags.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}
