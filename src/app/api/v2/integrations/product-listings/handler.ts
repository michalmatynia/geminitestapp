import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  TRADERA_INTEGRATION_SLUGS,
} from '@/features/integrations/constants/slugs';
import {
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  listAllProductListingsAcrossProviders,
  listProductListingsByProductIdsAcrossProviders,
} from '@/features/integrations/services/product-listing-repository';
import {
  applyCanonicalBaseBadgeFallback,
  isCanonicalBaseIntegrationSlug,
} from '@/features/integrations/services/base-listing-canonicalization';
import { resolvePendingTraderaExecutionAction } from '@/features/integrations/utils/tradera-listing-status';
import type { ListingBadgesPayload, MarketplaceBadgeEntry } from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalCsvQueryStringArray } from '@/shared/lib/api/query-schema';
import { env } from '@/shared/lib/env';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type MarketplaceBadgeKey = keyof MarketplaceBadgeEntry;
const shouldLogTiming = () => env.DEBUG_API_TIMING;

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const SUCCESS_STATUSES = new Set(['active', 'success', 'completed', 'listed', 'ok']);

const resolveMarketplaceKey = (slug: string | null | undefined): MarketplaceBadgeKey | null => {
  const normalized = (slug ?? '').trim().toLowerCase();
  if (isCanonicalBaseIntegrationSlug(normalized)) return 'base';
  if (TRADERA_INTEGRATION_SLUGS.has(normalized)) return 'tradera';
  if (normalized === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG) return 'playwrightProgrammable';
  return null;
};

const inferMarketplaceFromListingMetadata = (value: unknown): MarketplaceBadgeKey | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const marketplace =
    typeof data['marketplace'] === 'string' ? data['marketplace'].trim().toLowerCase() : '';
  if (isCanonicalBaseIntegrationSlug(marketplace)) return 'base';
  if (TRADERA_INTEGRATION_SLUGS.has(marketplace)) return 'tradera';
  if (marketplace === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG) return 'playwrightProgrammable';

  const source = typeof data['source'] === 'string' ? data['source'].trim().toLowerCase() : '';
  if (source.includes('base')) return 'base';
  if (source.includes('tradera')) return 'tradera';
  if (source.includes('playwright')) return 'playwrightProgrammable';

  const traderaData = data['tradera'];
  if (traderaData && typeof traderaData === 'object') return 'tradera';

  const baseData = data['base'];
  if (baseData && typeof baseData === 'object') return 'base';

  const playwrightData = data['playwright'];
  if (playwrightData && typeof playwrightData === 'object') return 'playwrightProgrammable';

  return null;
};

const PRODUCT_IDS_PARAM_LIMIT = 250;
const productIdsBodySchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1).max(PRODUCT_IDS_PARAM_LIMIT),
});

export const querySchema = z.object({
  productIds: optionalCsvQueryStringArray(),
});

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return value;
  }
};

const normalizeRequestedProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(productIds.map((value) => safeDecode(value).trim()).filter((value) => value.length > 0))
  );

const buildPayload = async (
  requestedProductIds: string[],
  timings?: Record<string, number | null | undefined>
): Promise<Response> => {
  const normalizedRequestedProductIds = normalizeRequestedProductIds(requestedProductIds).slice(
    0,
    PRODUCT_IDS_PARAM_LIMIT
  );

  const integrationRepository = await getIntegrationRepository();
  const lookupStart = performance.now();
  const listingsPromise =
    normalizedRequestedProductIds.length > 0
      ? listProductListingsByProductIdsAcrossProviders(normalizedRequestedProductIds)
      : listAllProductListingsAcrossProviders();
  const [listings, integrations] = await Promise.all([
    listingsPromise,
    integrationRepository.listIntegrations(),
  ]);
  if (timings) {
    timings['lookup'] = performance.now() - lookupStart;
  }

  const integrationMarketplaceById = new Map<string, MarketplaceBadgeKey>();
  for (const integration of integrations) {
    const marketplace = resolveMarketplaceKey(integration.slug);
    if (!marketplace) continue;
    integrationMarketplaceById.set(integration.id, marketplace);
  }

  const statusRank: Record<string, number> = {
    active: 5,
    success: 5,
    completed: 5,
    listed: 5,
    ok: 5,
    running: 4,
    processing: 4,
    in_progress: 4,
    pending: 3,
    queued: 3,
    queued_relist: 3,
    unsold: 2,
    ended: 2,
    failed: 1,
    needs_login: 1,
    auth_required: 1,
    error: 1,
    removed: 0,
  };

  const byProduct = new Map<string, MarketplaceBadgeEntry>();
  const productsWithPendingTraderaStatusCheck = new Set<string>();
  const candidateMetaByKey = new Map<
    string,
    {
      status: string;
      updatedAtMs: number;
      rank: number;
      success: boolean;
    }
  >();
  const assembleStart = performance.now();
  for (const listing of listings) {
    const marketplace =
      integrationMarketplaceById.get(listing.integrationId) ??
      inferMarketplaceFromListingMetadata(
        (listing as { marketplaceData?: unknown }).marketplaceData
    );
    if (!marketplace) continue;

    if (
      marketplace === 'tradera' &&
      resolvePendingTraderaExecutionAction(listing.marketplaceData) === 'check_status'
    ) {
      productsWithPendingTraderaStatusCheck.add(listing.productId);
    }

    const normalizedStatus = normalizeStatus(listing.status);
    const candidateKey = `${listing.productId}:${marketplace}`;
    const current = byProduct.get(listing.productId) ?? {};
    const currentMeta = candidateMetaByKey.get(candidateKey);
    const nextMeta = {
      status: normalizedStatus || 'unknown',
      updatedAtMs: Date.parse(listing.updatedAt ?? '') || 0,
      rank: statusRank[normalizedStatus] ?? -1,
      success: SUCCESS_STATUSES.has(normalizedStatus),
    };

    if (!currentMeta) {
      byProduct.set(listing.productId, {
        ...current,
        [marketplace]: nextMeta.status,
      });
      candidateMetaByKey.set(candidateKey, nextMeta);
      continue;
    }

    const shouldReplace = (() => {
      if (currentMeta.success !== nextMeta.success) {
        return nextMeta.success;
      }

      if (!currentMeta.success && !nextMeta.success) {
        if (nextMeta.updatedAtMs !== currentMeta.updatedAtMs) {
          return nextMeta.updatedAtMs > currentMeta.updatedAtMs;
        }
        return nextMeta.rank > currentMeta.rank;
      }

      if (nextMeta.rank !== currentMeta.rank) {
        return nextMeta.rank > currentMeta.rank;
      }

      return nextMeta.updatedAtMs > currentMeta.updatedAtMs;
    })();

    if (shouldReplace) {
      byProduct.set(listing.productId, {
        ...current,
        [marketplace]: nextMeta.status,
      });
      candidateMetaByKey.set(candidateKey, nextMeta);
    }
  }
  if (timings) {
    timings['assemble'] = performance.now() - assembleStart;
  }

  const payload = Object.fromEntries(byProduct.entries()) as ListingBadgesPayload;
  productsWithPendingTraderaStatusCheck.forEach((productId) => {
    payload[productId] = {
      ...(payload[productId] ?? {}),
      tradera: 'processing',
    };
  });
  const canonicalPayload = await applyCanonicalBaseBadgeFallback(
    payload,
    normalizedRequestedProductIds
  );

  return NextResponse.json(canonicalPayload);
};

/**
 * GET /api/v2/integrations/product-listings
 * Returns listing badge statuses grouped by marketplace for each product.
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const totalStart = performance.now();
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const response = await buildPayload(query.productIds ?? [], timings);
  timings['total'] = performance.now() - totalStart;
  attachTimingHeaders(response, timings);
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] integrations.product-listings.GET',
      context: timings,
    });
  }
  return response;
}

/**
 * POST /api/v2/integrations/product-listings
 * Returns listing badge statuses grouped by marketplace for requested products.
 */
export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const totalStart = performance.now();
  const parsed = await parseJsonBody(req, productIdsBodySchema, {
    logPrefix: 'integrations.product-listings.POST',
  });
  if (!parsed.ok) {
    timings['total'] = performance.now() - totalStart;
    attachTimingHeaders(parsed.response, timings);
    return parsed.response;
  }

  const response = await buildPayload(parsed.data.productIds, timings);
  timings['total'] = performance.now() - totalStart;
  attachTimingHeaders(response, timings);
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] integrations.product-listings.POST',
      context: timings,
    });
  }
  return response;
}
