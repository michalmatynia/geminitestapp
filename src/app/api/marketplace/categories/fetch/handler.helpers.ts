import {
  fetchBaseCategories,
  resolveBaseConnectionToken,
} from '@/features/integrations/server';
import {
  getTraderaCategories,
  getTraderaSubCategories,
  type TraderaPublicApiCredentials,
} from '@/features/integrations/services/tradera-api-client';
import { resolveTraderaPublicApiCredentials } from '@/features/integrations/services/tradera-listing/api';
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
const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera', 'tradera-api']);

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
      mode: 'tradera';
    }
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      sourceName: 'Tradera';
      responseSourceName: 'Tradera SOAP API';
      apiCredentials: TraderaPublicApiCredentials;
      mode: 'tradera-api';
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
    // - A stored setting that differs from the default 'playwright' acts as an override.
    // - 'playwright' stored (the default) + no explicit param → original auto-detect behaviour
    //   (try SOAP if credentials are present, fall back to public pages playwright).
    const storedOverride =
      systemSettings.categoryFetchMethod !== 'playwright'
        ? systemSettings.categoryFetchMethod
        : undefined;
    const effectiveMethod = categoryFetchMethod ?? storedOverride;

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

    // If 'playwright' is explicitly requested, skip SOAP and use the scraper.
    if (effectiveMethod !== 'playwright') {
      // Try SOAP API when credentials are present (or when explicitly requested via 'soap').
      try {
        const apiCredentials = resolveTraderaPublicApiCredentials(connection);
        return {
          connectionId,
          connection,
          sourceName: 'Tradera',
          responseSourceName: 'Tradera SOAP API',
          apiCredentials,
          mode: 'tradera-api',
        };
      } catch {
        if (effectiveMethod === 'soap') {
          // Credentials are required when SOAP is explicitly selected
          throw badRequestError(
            'Tradera SOAP API is not configured for this connection. Add Tradera App ID and App Key in the connection settings, or switch to the public taxonomy pages fetch method.'
          );
        }
        // No credentials and no explicit method — fall back to Playwright
      }
    }

    return {
      connectionId,
      connection,
      sourceName: 'Tradera',
      responseSourceName: 'Tradera public taxonomy pages',
      mode: 'tradera',
    };
  }

  throw badRequestError(`${integration.name} is not yet supported for category fetch`);
};

const SUBCATEGORY_EXPAND_CONCURRENCY = 10;
const SUBCATEGORY_EXPAND_MAX_CATEGORIES = 300;

/**
 * Expands the deepest level of the category tree by fetching subcategories for
 * all categories at the maximum depth returned by GetCategories.
 *
 * GetCategories only returns 2-3 levels; some leaf categories (e.g. "Other pins & needles")
 * only exist one level deeper and are required when creating a Tradera listing.
 */
const expandTraderaSubcategories = async (
  categories: BaseCategory[],
  credentials: TraderaPublicApiCredentials
): Promise<BaseCategory[]> => {
  if (categories.length === 0) return categories;

  // Find the maximum depth in the returned set
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const depthCache = new Map<string, number>();
  const getDepth = (id: string): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const cat = categoriesById.get(id);
    const parentId = cat?.parentId;
    const depth = parentId ? getDepth(parentId) + 1 : 0;
    depthCache.set(id, depth);
    return depth;
  };

  let maxDepth = 0;
  for (const cat of categories) {
    maxDepth = Math.max(maxDepth, getDepth(cat.id));
  }

  // Categories at max depth are potential parents of unexpanded leaves
  const deepestCategoryIds = categories
    .filter((c) => getDepth(c.id) === maxDepth)
    .slice(0, SUBCATEGORY_EXPAND_MAX_CATEGORIES)
    .map((c) => c.id);

  if (deepestCategoryIds.length === 0) return categories;

  // Fetch subcategories in batches of SUBCATEGORY_EXPAND_CONCURRENCY
  const newCategories: BaseCategory[] = [];
  for (let i = 0; i < deepestCategoryIds.length; i += SUBCATEGORY_EXPAND_CONCURRENCY) {
    const batch = deepestCategoryIds.slice(i, i + SUBCATEGORY_EXPAND_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) => getTraderaSubCategories(id, credentials))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newCategories.push(...result.value);
      }
    }
  }

  if (newCategories.length === 0) return categories;

  // Merge, deduplicating by id
  const existingIds = new Set(categories.map((c) => c.id));
  const uniqueNew = newCategories.filter((c) => !existingIds.has(c.id));
  return [...categories, ...uniqueNew];
};

export const fetchMarketplaceCategories = async (
  context: MarketplaceCategoryFetchContext
): Promise<BaseCategory[]> => {
  if (context.mode === 'base') {
    return fetchBaseCategories(context.token, {
      inventoryId: context.inventoryId,
    });
  }

  if (context.mode === 'tradera-api') {
    const categories = await getTraderaCategories(context.apiCredentials);
    return expandTraderaSubcategories(categories, context.apiCredentials);
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
