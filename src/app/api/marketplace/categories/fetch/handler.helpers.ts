import { DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';
import {
  fetchBaseCategories,
  resolveBaseConnectionToken,
} from '@/features/integrations/server';
import {
  fetchTraderaCategoriesForConnection,
  fetchTraderaCategoriesFromListingFormForConnection,
} from '@/features/integrations/services/tradera-listing/categories';
import { loadTraderaSystemSettings } from '@/features/integrations/services/tradera-system-settings';
import type { BaseCategory } from '@/shared/contracts/integrations/listings';
import type { IntegrationConnectionRecord, IntegrationLookupRepository } from '@/shared/contracts/integrations/repositories';
import type {
  MarketplaceCategoryStats,
  MarketplaceConnectionRequest,
  MarketplaceFetchResponse,
  TraderaCategoryFetchMethod,
} from '@/shared/contracts/integrations/marketplace';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera']);

const normalizeParentId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

const calculateCategoryDepth = (
  categoryId: string,
  categoriesById: Map<string, BaseCategory>,
  cache: Map<string, number>,
  trail: Set<string> = new Set()
): number => {
  if (cache.has(categoryId)) {
    return cache.get(categoryId) ?? 0;
  }
  if (trail.has(categoryId)) {
    return 0;
  }

  trail.add(categoryId);
  const category = categoriesById.get(categoryId);
  const parentId = normalizeParentId(category?.parentId ?? null);
  const depth = parentId ? calculateCategoryDepth(parentId, categoriesById, cache, trail) + 1 : 0;
  trail.delete(categoryId);
  cache.set(categoryId, depth);
  return depth;
};

export const buildMarketplaceCategoryStats = (
  categories: BaseCategory[]
): MarketplaceCategoryStats => {
  const categoriesById = new Map<string, BaseCategory>();
  for (const category of categories) {
    categoriesById.set(category.id, category);
  }

  const depthCache = new Map<string, number>();
  const depthHistogram: Record<string, number> = {};
  let rootCount = 0;
  let withParentCount = 0;
  let maxDepth = 0;

  for (const category of categories) {
    const parentId = normalizeParentId(category.parentId);
    if (parentId) {
      withParentCount += 1;
    } else {
      rootCount += 1;
    }

    const depth = calculateCategoryDepth(category.id, categoriesById, depthCache);
    maxDepth = Math.max(maxDepth, depth);
    depthHistogram[String(depth)] = (depthHistogram[String(depth)] ?? 0) + 1;
  }

  return {
    rootCount,
    withParentCount,
    maxDepth,
    depthHistogram,
  };
};

export type MarketplaceCategoryFetchContext =
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      inventoryId: string | null;
      sourceName: 'Base.com';
      responseSourceName: 'Base.com';
      token: string;
      mode: 'base';
    }
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      sourceName: 'Tradera';
      responseSourceName: 'Tradera public taxonomy pages';
      supportsListingForm: boolean;
      mode: 'tradera';
    }
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      sourceName: 'Tradera';
      responseSourceName: 'Tradera listing form picker';
      listingFormUrl: string;
      mode: 'tradera-listing-form';
    };

export const requireMarketplaceConnectionId = (
  body: Pick<MarketplaceConnectionRequest, 'connectionId'>
): string => {
  if (!body.connectionId) {
    throw badRequestError('connectionId is required');
  }
  return body.connectionId;
};

export const resolveMarketplaceCategoryFetchContext = async (
  integrationRepo: IntegrationLookupRepository,
  connectionId: string,
  categoryFetchMethod?: TraderaCategoryFetchMethod
): Promise<MarketplaceCategoryFetchContext> => {
  const connection = await integrationRepo.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = (integration.slug ?? '').toLowerCase();
  if (!integrationSlug) {
    throw badRequestError('Integration slug is missing');
  }

  if (BASE_MARKETPLACE_SLUGS.has(integrationSlug)) {
    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error ?? 'Base.com API token not configured for this connection'
      );
    }

    return {
      connectionId,
      connection,
      inventoryId: connection.baseLastInventoryId ?? null,
      sourceName: 'Base.com',
      responseSourceName: 'Base.com',
      token: tokenResolution.token,
      mode: 'base',
    };
  }

  if (TRADERA_MARKETPLACE_SLUGS.has(integrationSlug)) {
    const systemSettings = await loadTraderaSystemSettings();

    // Resolve the effective method.
    // - Explicit request param always wins.
    // - A stored setting that differs from the current system default acts as an override.
    // - Browser Tradera defaults to the listing form picker.
    // - Explicit overrides can still fall back to the public taxonomy pages.
    const storedOverride =
      systemSettings.categoryFetchMethod !== DEFAULT_TRADERA_SYSTEM_SETTINGS.categoryFetchMethod
        ? systemSettings.categoryFetchMethod
        : undefined;
    let effectiveMethod = categoryFetchMethod ?? storedOverride;

    if (!effectiveMethod) {
      effectiveMethod = DEFAULT_TRADERA_SYSTEM_SETTINGS.categoryFetchMethod;
    }

    if (effectiveMethod === 'playwright_listing_form') {
      return {
        connectionId,
        connection,
        sourceName: 'Tradera',
        responseSourceName: 'Tradera listing form picker',
        listingFormUrl: systemSettings.listingFormUrl,
        mode: 'tradera-listing-form',
      };
    }

    if (effectiveMethod === 'playwright') {
      return {
        connectionId,
        connection,
        sourceName: 'Tradera',
        responseSourceName: 'Tradera public taxonomy pages',
        supportsListingForm: integrationSlug === 'tradera',
        mode: 'tradera',
      };
    }
  }

  throw badRequestError(`${integration.name} is not yet supported for category fetch`);
};

export const fetchMarketplaceCategories = async (
  context: MarketplaceCategoryFetchContext
): Promise<BaseCategory[]> => {
  if (context.mode === 'base') {
    return fetchBaseCategories(context.token, {
      inventoryId: context.inventoryId,
    });
  }

  if (context.mode === 'tradera-listing-form') {
    return fetchTraderaCategoriesFromListingFormForConnection(context.connection, {
      listingFormUrl: context.listingFormUrl,
    });
  }

  return fetchTraderaCategoriesForConnection(context.connection);
};

export const buildEmptyMarketplaceCategoryFetchResponse = (
  sourceName: string
): MarketplaceFetchResponse => ({
  fetched: 0,
  total: 0,
  message: `No categories found in ${sourceName}.`,
  source: sourceName,
  categoryStats: {
    rootCount: 0,
    withParentCount: 0,
    maxDepth: 0,
    depthHistogram: {},
  },
});

export const buildMarketplaceCategoryFetchResponse = (
  sourceName: string,
  syncedCount: number,
  total: number,
  categoryStats: MarketplaceCategoryStats
): MarketplaceFetchResponse => ({
  fetched: syncedCount,
  total,
  message: `Successfully synced ${syncedCount} categories from ${sourceName} (roots: ${categoryStats.rootCount}, max depth: ${categoryStats.maxDepth}).`,
  source: sourceName,
  categoryStats,
});
