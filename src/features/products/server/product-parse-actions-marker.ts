import { integrationService } from '@/features/integrations/services/integration-service';
import { getProductListingRepository } from '@/features/integrations/services/product-listing-repository';
import type {
  ProductListing,
  ProductListingExportEvent,
} from '@/shared/contracts/integrations/listings';
import type {
  ProductParseActionsMarkClosedResult,
  ProductParseActionsMarkClosedTarget,
  ProductParseActionsMarkTraderaClosedResponse,
} from '@/shared/contracts/products/parse-actions';
import { isTraderaIntegrationSlug } from '@/shared/lib/integration-slugs';

import { TRADERA_CLOSED_STATUS } from './product-parse-actions-parser';

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const resolveTraderaIntegrationIds = async (): Promise<Set<string>> => {
  const integrations = await integrationService.listIntegrations();
  return new Set(
    integrations
      .filter((integration): boolean => isTraderaIntegrationSlug(integration.slug))
      .map((integration): string => integration.id)
  );
};

const buildClosedMarketplaceData = (
  listing: ProductListing,
  target: ProductParseActionsMarkClosedTarget,
  now: string
): Record<string, unknown> => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  return {
    ...marketplaceData,
    tradera: {
      ...traderaData,
      pendingExecution: null,
      lastExecution: {
        action: 'parse_mark_closed',
        executedAt: now,
        status: 'completed',
        completedAt: now,
        ok: true,
        metadata: {
          checkedStatus: TRADERA_CLOSED_STATUS,
          displayStatus: 'Closed',
          source: 'products.parse-actions',
          rowId: target.rowId,
          objectNumber: target.objectNumber ?? null,
          title: target.title ?? null,
        },
      },
    },
  };
};

const buildClosedExportHistory = (
  listing: ProductListing,
  target: ProductParseActionsMarkClosedTarget,
  now: string
): ProductListingExportEvent[] => {
  const entry: ProductListingExportEvent = {
    exportedAt: now,
    status: TRADERA_CLOSED_STATUS,
    externalListingId: target.objectNumber ?? listing.externalListingId ?? null,
    failureReason: null,
    fields: ['action:parse_mark_closed', 'status:closed', 'source:products.parse-actions'],
  };

  return [entry, ...(listing.exportHistory ?? [])].slice(0, 50);
};

const markOneClosed = async (
  target: ProductParseActionsMarkClosedTarget,
  traderaIntegrationIds: Set<string>
): Promise<ProductParseActionsMarkClosedResult> => {
  const repository = await getProductListingRepository();
  const listing = await repository.getListingById(target.listingId);
  if (listing === null) {
    return { ...target, status: 'failed', message: 'Listing was not found.' };
  }
  if (listing.productId !== target.productId) {
    return {
      ...target,
      status: 'failed',
      message: 'Listing does not belong to the matched product.',
    };
  }
  if (!traderaIntegrationIds.has(listing.integrationId)) {
    return { ...target, status: 'failed', message: 'Listing is not a Tradera listing.' };
  }
  if (listing.status.trim().toLowerCase() === TRADERA_CLOSED_STATUS) {
    return { ...target, status: 'skipped', message: 'Listing is already closed.' };
  }
  const now = new Date().toISOString();
  await repository.updateListing(listing.id, {
    status: TRADERA_CLOSED_STATUS,
    lastStatusCheckAt: now,
    failureReason: null,
    marketplaceData: buildClosedMarketplaceData(listing, target, now),
    exportHistory: buildClosedExportHistory(listing, target, now),
  });
  return { ...target, status: 'updated', message: null };
};

export const markParsedTraderaMatchesClosed = async (
  targets: ProductParseActionsMarkClosedTarget[]
): Promise<ProductParseActionsMarkTraderaClosedResponse> => {
  const traderaIntegrationIds = await resolveTraderaIntegrationIds();
  const uniqueTargets = Array.from(
    new Map(targets.map((target) => [target.listingId, target])).values()
  );
  const results = await Promise.all(
    uniqueTargets.map((target: ProductParseActionsMarkClosedTarget) =>
      markOneClosed(target, traderaIntegrationIds)
    )
  );
  return {
    status: 'ok',
    requested: uniqueTargets.length,
    updated: results.filter((result) => result.status === 'updated').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
};
