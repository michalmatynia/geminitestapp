import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  getProductListingRepository,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { env } from '@/shared/lib/env';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
type MarketplaceBadgeKey = 'base' | 'tradera';
type ProductListingBadgesPayload = Record<string, Partial<Record<MarketplaceBadgeKey, string>>>;
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

const resolveMarketplaceKey = (slug: string | null | undefined): MarketplaceBadgeKey | null => {
  const normalized = (slug ?? '').trim().toLowerCase();
  if (BASE_INTEGRATION_SLUGS.has(normalized)) return 'base';
  if (TRADERA_INTEGRATION_SLUGS.has(normalized)) return 'tradera';
  return null;
};

const inferMarketplaceFromListingMetadata = (value: unknown): MarketplaceBadgeKey | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const marketplace =
    typeof data['marketplace'] === 'string' ? data['marketplace'].trim().toLowerCase() : '';
  if (BASE_INTEGRATION_SLUGS.has(marketplace)) return 'base';
  if (TRADERA_INTEGRATION_SLUGS.has(marketplace)) return 'tradera';

  const source = typeof data['source'] === 'string' ? data['source'].trim().toLowerCase() : '';
  if (source.includes('base')) return 'base';
  if (source.includes('tradera')) return 'tradera';

  const traderaData = data['tradera'];
  if (traderaData && typeof traderaData === 'object') return 'tradera';

  const baseData = data['base'];
  if (baseData && typeof baseData === 'object') return 'base';

  return null;
};

const PRODUCT_IDS_PARAM_LIMIT = 250;
const productIdsBodySchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1).max(PRODUCT_IDS_PARAM_LIMIT),
});

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeRequestedProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(productIds.map((value) => safeDecode(value).trim()).filter((value) => value.length > 0))
  );

const parseRequestedProductIds = (req: NextRequest): string[] => {
  const raw = req.nextUrl.searchParams.get('productIds');
  if (!raw) return [];
  return normalizeRequestedProductIds(raw.split(',')).slice(0, PRODUCT_IDS_PARAM_LIMIT);
};

const buildPayload = async (
  requestedProductIds: string[],
  timings?: Record<string, number | null | undefined>
): Promise<Response> => {
  const normalizedRequestedProductIds = normalizeRequestedProductIds(requestedProductIds).slice(
    0,
    PRODUCT_IDS_PARAM_LIMIT
  );

  const integrationRepository = await getIntegrationRepository();
  const listingRepository = await getProductListingRepository();
  const lookupStart = performance.now();
  const listingsPromise =
    normalizedRequestedProductIds.length > 0
      ? listingRepository.getListingsByProductIds(normalizedRequestedProductIds)
      : listingRepository.listAllListings();
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
    failed: 1,
    needs_login: 1,
    auth_required: 1,
    error: 1,
    removed: 0,
  };

  const byProduct = new Map<string, Partial<Record<MarketplaceBadgeKey, string>>>();
  const assembleStart = performance.now();
  for (const listing of listings) {
    const marketplace =
      integrationMarketplaceById.get(listing.integrationId) ??
      inferMarketplaceFromListingMetadata(
        (listing as { marketplaceData?: unknown }).marketplaceData
      );
    if (!marketplace) continue;

    const normalizedStatus = normalizeStatus(listing.status);
    const current = byProduct.get(listing.productId) ?? {};
    const currentStatus = current[marketplace];
    if (!currentStatus) {
      byProduct.set(listing.productId, {
        ...current,
        [marketplace]: normalizedStatus || 'unknown',
      });
      continue;
    }
    const currentRank = statusRank[currentStatus] ?? -1;
    const nextRank = statusRank[normalizedStatus] ?? -1;
    if (nextRank > currentRank) {
      byProduct.set(listing.productId, {
        ...current,
        [marketplace]: normalizedStatus || 'unknown',
      });
    }
  }
  if (timings) {
    timings['assemble'] = performance.now() - assembleStart;
  }

  return NextResponse.json(Object.fromEntries(byProduct.entries()) as ProductListingBadgesPayload);
};

/**
 * GET /api/v2/integrations/product-listings
 * Returns listing badge statuses grouped by marketplace for each product.
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const totalStart = performance.now();
  const response = await buildPayload(parseRequestedProductIds(req), timings);
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
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
