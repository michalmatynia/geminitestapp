import { NextRequest, NextResponse } from 'next/server';

import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import {
  getIntegrationRepository,
  listProductListingsByProductIdsAcrossProviders,
  listAllProductListingsAcrossProviders,
} from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
type MarketplaceBadgeKey = 'base' | 'tradera';
type ProductListingBadgesPayload = Record<string, Partial<Record<MarketplaceBadgeKey, string>>>;

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

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseRequestedProductIds = (req: NextRequest): string[] => {
  const raw = req.nextUrl.searchParams.get('productIds');
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((value) => safeDecode(value).trim())
        .filter((value) => value.length > 0)
        .slice(0, PRODUCT_IDS_PARAM_LIMIT)
    )
  );
};

/**
 * GET /api/integrations/product-listings
 * Returns listing badge statuses grouped by marketplace for each product.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrationRepository = await getIntegrationRepository();
  const requestedProductIds = parseRequestedProductIds(_req);
  const listingsPromise =
    requestedProductIds.length > 0
      ? listProductListingsByProductIdsAcrossProviders(requestedProductIds)
      : listAllProductListingsAcrossProviders();
  const [listings, integrations] = await Promise.all([
    listingsPromise,
    integrationRepository.listIntegrations(),
  ]);

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

  return NextResponse.json(Object.fromEntries(byProduct.entries()) as ProductListingBadgesPayload);
}
