'use client';

import type { ExternalCategory, CategoryMappingWithDetails } from '@/shared/contracts/integrations';
import type {
  ExternalProducer,
  ProducerMappingWithDetails,
} from '@/shared/contracts/integrations';
import type {
  ExternalTag,
  TagMappingWithDetails,
} from '@/shared/contracts/integrations';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
} from '@/shared/lib/query-factories-v2';
import { marketplaceKeys } from '@/shared/lib/query-key-exports';

export function useExternalCategories(connectionId: string): ListQuery<ExternalCategory> {
  const queryKey = marketplaceKeys.categories(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<ExternalCategory[]>(`/api/marketplace/categories?connectionId=${connectionId}`),
    enabled: !!connectionId,
    meta: {
      source: 'integrations.hooks.useExternalCategories',
      operation: 'list',
      resource: 'marketplace.categories',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'categories'],
    },
  });
}

export function useCategoryMappings(connectionId: string, catalogId?: string | null): ListQuery<CategoryMappingWithDetails> {
  const queryKey = marketplaceKeys.mappings(connectionId, catalogId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (!catalogId) return [];
      return api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${catalogId}`
      );
    },
    enabled: !!connectionId && !!catalogId,
    meta: {
      source: 'integrations.hooks.useCategoryMappings',
      operation: 'list',
      resource: 'marketplace.mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'mappings'],
    },
  });
}

export function useCategoryMappingsByConnection(
  connectionId: string,
  options?: { enabled?: boolean }
): ListQuery<CategoryMappingWithDetails> {
  const isEnabled = options?.enabled ?? !!connectionId;

  const queryKey = marketplaceKeys.mappings(connectionId, 'all');
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<CategoryMappingWithDetails[]>(`/api/marketplace/mappings?connectionId=${connectionId}`),
    enabled: isEnabled && !!connectionId,
    meta: {
      source: 'integrations.hooks.useCategoryMappingsByConnection',
      operation: 'list',
      resource: 'marketplace.mappings.connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'mappings'],
    },
  });
}

export function useExternalProducers(connectionId: string): ListQuery<ExternalProducer> {
  const queryKey = marketplaceKeys.producers(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<ExternalProducer[]>(`/api/marketplace/producers?connectionId=${connectionId}`),
    enabled: !!connectionId,
    meta: {
      source: 'integrations.hooks.useExternalProducers',
      operation: 'list',
      resource: 'marketplace.producers',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'producers'],
    },
  });
}

export function useProducerMappings(
  connectionId: string
): ListQuery<ProducerMappingWithDetails> {
  const queryKey = marketplaceKeys.producerMappings(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<ProducerMappingWithDetails[]>(
        `/api/marketplace/producer-mappings?connectionId=${connectionId}`
      ),
    enabled: !!connectionId,
    meta: {
      source: 'integrations.hooks.useProducerMappings',
      operation: 'list',
      resource: 'marketplace.producer-mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'producer-mappings'],
    },
  });
}

export function useExternalTags(connectionId: string): ListQuery<ExternalTag> {
  const queryKey = marketplaceKeys.tags(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<ExternalTag[]>(`/api/marketplace/tags?connectionId=${connectionId}`),
    enabled: !!connectionId,
    meta: {
      source: 'integrations.hooks.useExternalTags',
      operation: 'list',
      resource: 'marketplace.tags',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'tags'],
    },
  });
}

export function useTagMappings(
  connectionId: string
): ListQuery<TagMappingWithDetails> {
  const queryKey = marketplaceKeys.tagMappings(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<TagMappingWithDetails[]>(
        `/api/marketplace/tag-mappings?connectionId=${connectionId}`
      ),
    enabled: !!connectionId,
    meta: {
      source: 'integrations.hooks.useTagMappings',
      operation: 'list',
      resource: 'marketplace.tag-mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'tag-mappings'],
    },
  });
}
