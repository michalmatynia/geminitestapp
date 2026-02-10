export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository, listAllProductListingsAcrossProviders } from '@/features/integrations/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com']);

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

/**
 * GET /api/integrations/product-listings
 * Returns a map of product IDs to Base.com listing status.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const [listings, integrations] = await Promise.all([
    listAllProductListingsAcrossProviders(),
    getIntegrationRepository().then((repo) => repo.listIntegrations()),
  ]);

  const baseIntegrationIds = new Set(
    integrations
      .filter((integration) => BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase()))
      .map((integration) => integration.id)
  );

  if (baseIntegrationIds.size === 0) {
    return NextResponse.json({});
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
    failed: 1,
    error: 1,
    removed: 0,
  };

  const byProduct = new Map<string, string>();
  for (const listing of listings) {
    if (!baseIntegrationIds.has(listing.integrationId)) continue;

    const normalizedStatus = normalizeStatus(listing.status);
    const current = byProduct.get(listing.productId);
    if (!current) {
      byProduct.set(listing.productId, normalizedStatus || 'unknown');
      continue;
    }
    const currentRank = statusRank[current] ?? -1;
    const nextRank = statusRank[normalizedStatus] ?? -1;
    if (nextRank > currentRank) {
      byProduct.set(listing.productId, normalizedStatus || 'unknown');
    }
  }

  return NextResponse.json(Object.fromEntries(byProduct.entries()));
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.listings.GET',
    requireCsrf: false,
    cacheControl: 'no-store',
  });
