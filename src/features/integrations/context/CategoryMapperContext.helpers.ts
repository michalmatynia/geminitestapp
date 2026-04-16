import type {
  CategoryMappingWithDetails,
  ExternalCategory,
} from '@/shared/contracts/integrations/listings';
import type {
  MarketplaceFetchResponse,
  TraderaCategoryFetchMethod,
} from '@/shared/contracts/integrations/marketplace';
import { ApiError } from '@/shared/lib/api-client';

import { isMissingExternalCategoryName, isRootExternalCategory } from './CategoryMapperContext.utils';

export type CategoryMapperFetchWarning = {
  message: string;
  sourceName: string | null;
  existingTotal: number | null;
  existingMaxDepth: number | null;
  fetchedTotal: number | null;
  fetchedMaxDepth: number | null;
};

export type CategoryMapperIssueRow = {
  externalCategoryId: string;
  externalCategoryName: string;
  externalCategoryPath: string | null;
  internalCategoryLabel: string | null;
};

export interface CategoryMapperConfig {
  connectionId: string;
  connectionName: string;
  integrationId?: string | undefined;
  integrationSlug?: string | undefined;
}

export interface CategoryMapperUIState {
  pendingMappings: Map<string, string | null>;
  expandedIds: Set<string>;
  toggleExpand: (categoryId: string) => void;
  lastFetchResult: MarketplaceFetchResponse | null;
  lastFetchWarning: CategoryMapperFetchWarning | null;
  categoryFetchMethod: TraderaCategoryFetchMethod;
  setCategoryFetchMethod: (method: TraderaCategoryFetchMethod) => void;
  staleMappings: CategoryMapperIssueRow[];
  nonLeafMappings: CategoryMapperIssueRow[];
  stats: {
    total: number;
    mapped: number;
    unmapped: number;
    pending: number;
    stale: number;
    nonLeaf: number;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const extractTraderaFetchWarning = (
  error: unknown
): CategoryMapperFetchWarning | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const payload = isRecord(error.payload) ? error.payload : null;
  const meta = payload && isRecord(payload['meta']) ? payload['meta'] : null;
  const code = typeof payload?.['code'] === 'string' ? payload['code'] : null;
  const sourceName = typeof meta?.['sourceName'] === 'string' ? meta['sourceName'].trim() : '';
  const existingMaxDepth = readFiniteNumber(meta?.['existingMaxDepth']);
  const fetchedMaxDepth = readFiniteNumber(meta?.['fetchedMaxDepth']);

  if (
    code !== 'UNPROCESSABLE_ENTITY' ||
    sourceName !== 'Tradera public taxonomy pages' ||
    existingMaxDepth === null ||
    fetchedMaxDepth === null ||
    existingMaxDepth <= fetchedMaxDepth
  ) {
    return null;
  }

  return {
    message: error.message,
    sourceName,
    existingTotal: readFiniteNumber(meta?.['existingTotal']),
    existingMaxDepth,
    fetchedTotal: readFiniteNumber(meta?.['fetchedTotal']),
    fetchedMaxDepth,
  };
};

export const buildInitialExpandedIds = (
  externalCategories: ExternalCategory[],
  externalIds: Set<string>
): Set<string> =>
  new Set(
    externalCategories
      .filter((category: ExternalCategory) => isRootExternalCategory(category, externalIds))
      .map((category: ExternalCategory) => category.id)
  );

const mapIssueRow = (mapping: CategoryMappingWithDetails): CategoryMapperIssueRow => ({
  externalCategoryId: mapping.externalCategoryId,
  externalCategoryName: mapping.externalCategory?.name?.trim() || mapping.externalCategoryId,
  externalCategoryPath: mapping.externalCategory?.path?.trim() || null,
  internalCategoryLabel: mapping.internalCategory?.name?.trim() || mapping.internalCategoryId || null,
});

export const buildStaleMappings = (
  mappings: CategoryMappingWithDetails[],
  externalIds: Set<string>
): CategoryMapperIssueRow[] =>
  mappings
    .filter((mapping: CategoryMappingWithDetails): boolean => {
      if (!mapping.isActive) return false;
      const externalCategoryId = mapping.externalCategoryId.trim();
      if (!externalCategoryId) return false;
      return (
        !externalIds.has(externalCategoryId) ||
        isMissingExternalCategoryName(mapping.externalCategory?.name)
      );
    })
    .map(mapIssueRow);

export const buildNonLeafMappings = (
  mappings: CategoryMappingWithDetails[],
  externalIds: Set<string>,
  isTraderaConnection: boolean
): CategoryMapperIssueRow[] => {
  if (!isTraderaConnection) {
    return [];
  }

  return mappings
    .filter((mapping: CategoryMappingWithDetails): boolean => {
      if (!mapping.isActive) return false;
      const externalCategoryId = mapping.externalCategoryId.trim();
      if (!externalCategoryId || !externalIds.has(externalCategoryId)) return false;
      if (isMissingExternalCategoryName(mapping.externalCategory?.name)) return false;
      return mapping.externalCategory?.isLeaf === false;
    })
    .map(mapIssueRow);
};

export const buildCategoryMapperStats = ({
  externalCategories,
  getMappingForExternal,
  pendingMappingsSize,
  staleMappingsLength,
  nonLeafMappingsLength,
}: {
  externalCategories: ExternalCategory[];
  getMappingForExternal: (externalCategoryId: string) => string | null;
  pendingMappingsSize: number;
  staleMappingsLength: number;
  nonLeafMappingsLength: number;
}): {
  total: number;
  mapped: number;
  unmapped: number;
  pending: number;
  stale: number;
  nonLeaf: number;
} => {
  const total = externalCategories.length;
  const mapped = externalCategories.filter(
    (category: ExternalCategory) => getMappingForExternal(category.externalId) !== null
  ).length;
  const unmapped = Math.max(0, total - mapped);

  return {
    total,
    mapped,
    unmapped,
    pending: pendingMappingsSize,
    stale: staleMappingsLength,
    nonLeaf: nonLeafMappingsLength,
  };
};

export type { MarketplaceFetchResponse };
