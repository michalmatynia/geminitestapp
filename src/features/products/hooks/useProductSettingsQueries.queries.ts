import type { PriceGroup, CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type {
  ProductValidationPattern,
  ProductValidatorConfig,
  ProductValidatorSettings,
} from '@/shared/contracts/products/validation';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { useListQueryV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';
import {
  useCatalogs as useMetadataCatalogs,
  useParameters as useMetadataParameters,
  usePriceGroups as useMetadataPriceGroups,
  type ProductMetadataQueryOptions,
  useShippingGroups as useMetadataShippingGroups,
  useSimpleParameters as useMetadataSimpleParameters,
  useTags as useMetadataTags,
} from './useProductMetadataQueries';
import { STABLE_SETTINGS_QUERY_OPTIONS } from './useProductSettingsQueries.shared';

export function usePriceGroups(options?: ProductMetadataQueryOptions): ListQuery<PriceGroup> {
  return useMetadataPriceGroups(options);
}

export function useCatalogs(options?: ProductMetadataQueryOptions): ListQuery<CatalogRecord> {
  return useMetadataCatalogs(options);
}

export function useCategories(
  catalogId: string | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategoryWithChildren> {
  const queryKey = productSettingsKeys.categoryTree(catalogId);
  return useListQueryV2({
    queryKey,
    queryFn: () => api.getCategories(catalogId),
    enabled: catalogId !== null && catalogId.length > 0 && (options?.enabled ?? true),
    ...STABLE_SETTINGS_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCategories',
      operation: 'list',
      resource: 'products.settings.categories.tree',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'categories', 'tree'],
      description: 'Loads products settings categories tree.',
    },
  });
}

export function useTags(
  catalogId: string | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTag> {
  return useMetadataTags(catalogId ?? undefined, options);
}

export function useShippingGroups(
  catalogId: string | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductShippingGroup> {
  return useMetadataShippingGroups(catalogId ?? undefined, options);
}

export function useCustomFields(
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCustomFieldDefinition> {
  const queryKey = productSettingsKeys.customFields();
  return useListQueryV2({
    queryKey,
    queryFn: api.getCustomFields,
    enabled: options?.enabled ?? true,
    ...STABLE_SETTINGS_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCustomFieldsSettings',
      operation: 'list',
      resource: 'products.settings.custom-fields',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'custom-fields'],
      description: 'Loads products settings custom fields.',
    },
  });
}

export function useParameters(
  catalogId: string | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductParameter> {
  return useMetadataParameters(catalogId ?? undefined, options);
}

export function useSimpleParameters(catalogId: string | null): ListQuery<ProductSimpleParameter> {
  return useMetadataSimpleParameters(catalogId ?? undefined);
}

export function useValidatorSettings(): SingleQuery<ProductValidatorSettings> {
  const queryKey = productSettingsKeys.validatorSettings();
  return useSingleQueryV2({
    id: 'global',
    queryKey,
    queryFn: api.getValidatorSettings,
    ...STABLE_SETTINGS_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useValidatorSettings',
      operation: 'detail',
      resource: 'products.settings.validator',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator'],
      description: 'Loads products settings validator.',
    },
  });
}

export function useValidationPatterns(): ListQuery<ProductValidationPattern> {
  const queryKey = productSettingsKeys.validatorPatterns();
  return useListQueryV2({
    queryKey,
    queryFn: api.getValidationPatterns,
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.hooks.useValidationPatterns',
      operation: 'list',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator', 'patterns'],
      description: 'Loads products settings validator patterns.',
    },
  });
}

export function useProductValidatorConfig(
  includeDisabled: boolean = false
): SingleQuery<ProductValidatorConfig> {
  const id = includeDisabled ? 'config-all' : 'config-active';
  const queryKey = productSettingsKeys.validatorConfig(includeDisabled);
  return useSingleQueryV2({
    id,
    queryKey,
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.hooks.useProductValidatorConfig',
      operation: 'detail',
      resource: 'products.settings.validator.config',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator', 'config'],
      description: 'Loads products settings validator config.',
    },
  });
}
