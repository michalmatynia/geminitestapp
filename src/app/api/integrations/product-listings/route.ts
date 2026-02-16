export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository, listAllProductListingsAcrossProviders } from '@/features/integrations/server';
import { getProductRepository } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
type MarketplaceBadgeKey = 'base' | 'tradera';
type ProductListingBadgesPayload = Record<
  string,
  Partial<Record<MarketplaceBadgeKey, string>>
>;

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const resolveMarketplaceKey = (
  slug: string | null | undefined
): MarketplaceBadgeKey | null => {
  const normalized = (slug ?? '').trim().toLowerCase();
  if (BASE_INTEGRATION_SLUGS.has(normalized)) return 'base';
  if (TRADERA_INTEGRATION_SLUGS.has(normalized)) return 'tradera';
  return null;
};

const inferMarketplaceFromListingMetadata = (
  value: unknown
): MarketplaceBadgeKey | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const marketplace =
    typeof data['marketplace'] === 'string'
      ? data['marketplace'].trim().toLowerCase()
      : '';
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

const listProductsWithBaseIds = async (): Promise<
  Array<{ id: string; baseProductId: string }>
> => {
  const productRepository = await getProductRepository();
  const pageSize = 500;
  const maxPages = 40;
  const products: Array<{ id: string; baseProductId: string }> = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const rows = await productRepository.getProducts({ page, pageSize });
    if (rows.length === 0) break;

    rows.forEach((product) => {
      const baseProductId = (product.baseProductId ?? '').trim();
      if (!baseProductId) return;
      products.push({ id: product.id, baseProductId });
    });

    if (rows.length < pageSize) break;
  }

  return products;
};

/**
 * GET /api/integrations/product-listings
 * Returns listing badge statuses grouped by marketplace for each product.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrationRepository = await getIntegrationRepository();
  const [listings, integrations] = await Promise.all([
    listAllProductListingsAcrossProviders(),
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

  // Keep BL badge active for previously imported products even before listing
  // records are fully backfilled.
  const linkedProducts = await listProductsWithBaseIds();
  for (const product of linkedProducts) {
    const current = byProduct.get(product.id) ?? {};
    if (!current.base) {
      byProduct.set(product.id, {
        ...current,
        base: 'active',
      });
    }
  }

  return NextResponse.json(
    Object.fromEntries(byProduct.entries()) as ProductListingBadgesPayload
  );
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.listings.GET',
    requireCsrf: false,
    cacheControl: 'no-store',
  });
