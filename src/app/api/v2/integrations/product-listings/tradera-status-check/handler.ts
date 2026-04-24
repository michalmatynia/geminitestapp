import { type NextRequest, NextResponse } from 'next/server';

import { assertTraderaBrowserSessionReady } from '@/app/api/v2/integrations/_shared/tradera-browser-session-preflight';
import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  getIntegrationRepository,
  getProductListingRepository,
} from '@/features/integrations/server';
import {
  buildQueuedTraderaStatusCheckMarketplaceData,
  isTraderaStatusCheckPending,
  selectPreferredTraderaListingForStatusCheck,
} from '@/features/integrations/utils/tradera-status-check';
import {
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import {
  traderaListingStatusCheckBatchPayloadSchema,
  type TraderaListingStatusCheckBatchItem,
  type TraderaListingStatusCheckBatchReason,
  type TraderaListingStatusCheckBatchReasonCounts,
  type TraderaListingStatusCheckBatchTarget,
  type TraderaListingStatusCheckBatchResponse,
} from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

type NormalizedBatchTarget = {
  productId: string;
  listingId: string | null;
};

const isTraderaStatusCheckAuthRequiredMessage = (
  value: string | null | undefined
): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('session expired') ||
    normalized.includes('session has expired') ||
    normalized.includes('missing or expired') ||
    normalized.includes('captcha') ||
    normalized.includes('manual verification')
  );
};

const countBatchReasons = (
  results: readonly TraderaListingStatusCheckBatchItem[]
): TraderaListingStatusCheckBatchReasonCounts => {
  const counts: Partial<Record<TraderaListingStatusCheckBatchReason, number>> = {};

  for (const result of results) {
    const reason = result.reason;
    if (!reason) continue;
    counts[reason] = (counts[reason] ?? 0) + 1;
  }

  return counts;
};

const normalizeRequestedBatchTargets = ({
  productIds,
  targets,
}: {
  productIds?: readonly string[] | undefined;
  targets?: readonly TraderaListingStatusCheckBatchTarget[] | undefined;
}): NormalizedBatchTarget[] => {
  const normalizedTargets: NormalizedBatchTarget[] = [];
  const seenProductIds = new Set<string>();

  for (const target of targets ?? []) {
    const productId = target.productId.trim();
    const listingId =
      typeof target.listingId === 'string' && target.listingId.trim().length > 0
        ? target.listingId.trim()
        : null;
    if (!productId || seenProductIds.has(productId)) continue;
    seenProductIds.add(productId);
    normalizedTargets.push({ productId, listingId });
  }

  for (const rawProductId of productIds ?? []) {
    const productId = rawProductId.trim();
    if (!productId || seenProductIds.has(productId)) continue;
    seenProductIds.add(productId);
    normalizedTargets.push({ productId, listingId: null });
  }

  return normalizedTargets;
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, traderaListingStatusCheckBatchPayloadSchema, {
    logPrefix: 'integrations.product-listings.tradera-status-check.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const requestedTargets = normalizeRequestedBatchTargets(parsed.data);
  const requestedProductIds = requestedTargets.map((target) => target.productId);
  const listingRepository = await getProductListingRepository();
  const integrationRepository = await getIntegrationRepository();
  const [listings, integrations] = await Promise.all([
    listingRepository.getListingsByProductIds(requestedProductIds),
    integrationRepository.listIntegrations(),
  ]);

  const integrationSlugById = new Map(
    integrations.map((integration) => [integration.id, integration.slug])
  );
  const listingsByProductId = new Map<string, typeof listings>();
  listings.forEach((listing) => {
    const current = listingsByProductId.get(listing.productId);
    if (current) {
      current.push(listing);
      return;
    }
    listingsByProductId.set(listing.productId, [listing]);
  });

  const resultByProductId = new Map<string, TraderaListingStatusCheckBatchItem>();
  const queueCandidates: Array<{
    productId: string;
    listing: (typeof listings)[number];
  }> = [];

  for (const target of requestedTargets) {
    const productListings = listingsByProductId.get(target.productId) ?? [];
    const browserListings = productListings.filter((listing) =>
      isTraderaBrowserIntegrationSlug(integrationSlugById.get(listing.integrationId))
    );
    const explicitlyRequestedListing = target.listingId
      ? browserListings.find((listing) => listing.id === target.listingId) ?? null
      : null;
    const selectedListing =
      explicitlyRequestedListing ??
      selectPreferredTraderaListingForStatusCheck(browserListings);

    if (target.listingId && !explicitlyRequestedListing) {
      resultByProductId.set(target.productId, {
        productId: target.productId,
        listingId: target.listingId,
        status: 'skipped',
        reason: 'selected_listing_unavailable',
        message: 'The selected Tradera listing is no longer available for live status check.',
      });
      continue;
    }

    if (!selectedListing) {
      resultByProductId.set(target.productId, {
        productId: target.productId,
        listingId: null,
        status: 'skipped',
        reason: 'no_tradera_browser_listing',
        message: 'No Tradera browser listing available for live status check.',
      });
      continue;
    }

    if (isTraderaStatusCheckPending(selectedListing)) {
      resultByProductId.set(target.productId, {
        productId: target.productId,
        listingId: selectedListing.id,
        status: 'already_queued',
        reason: 'already_queued',
        message: 'Live status check already queued for this listing.',
      });
      continue;
    }

    queueCandidates.push({ productId: target.productId, listing: selectedListing });
  }

  const preflightReadyCandidates: typeof queueCandidates = [];
  const preflightFailureByConnectionKey = new Map<string, string>();

  for (const candidate of queueCandidates) {
    const connectionKey = `${candidate.listing.integrationId}:${candidate.listing.connectionId}`;
    let failureMessage = preflightFailureByConnectionKey.get(connectionKey) ?? null;

    if (!failureMessage) {
      try {
        await assertTraderaBrowserSessionReady({
          integrationRepository,
          integrationId: candidate.listing.integrationId,
          connectionId: candidate.listing.connectionId,
        });
      } catch (error) {
        failureMessage =
          error instanceof Error
            ? error.message
            : 'Tradera browser session preflight failed.';
        preflightFailureByConnectionKey.set(connectionKey, failureMessage);
      }
    }

    if (failureMessage) {
      const reason: TraderaListingStatusCheckBatchReason =
        isTraderaStatusCheckAuthRequiredMessage(failureMessage)
          ? 'auth_required'
          : 'preflight_failed';
      resultByProductId.set(candidate.productId, {
        productId: candidate.productId,
        listingId: candidate.listing.id,
        status: 'error',
        reason,
        message: failureMessage,
      });
      continue;
    }

    preflightReadyCandidates.push(candidate);
  }

  if (preflightReadyCandidates.length > 0) {
    initializeQueues();
  }

  for (const candidate of preflightReadyCandidates) {
    try {
      const queueJobInput = {
        listingId: candidate.listing.id,
        action: 'check_status' as const,
        source: 'manual' as const,
        ...(typeof parsed.data.selectorProfile === 'string' &&
        parsed.data.selectorProfile.length > 0
          ? { selectorProfile: parsed.data.selectorProfile }
          : {}),
      };
      const jobId = await enqueueTraderaListingJob({
        ...queueJobInput,
      });
      const enqueuedAt = new Date().toISOString();
      await listingRepository.updateListing(candidate.listing.id, {
        marketplaceData: buildQueuedTraderaStatusCheckMarketplaceData({
          existingMarketplaceData: candidate.listing.marketplaceData,
          requestId: jobId,
          queuedAt: enqueuedAt,
          requestedSelectorProfile: parsed.data.selectorProfile,
        }),
      });
      resultByProductId.set(candidate.productId, {
        productId: candidate.productId,
        listingId: candidate.listing.id,
        status: 'queued',
        reason: 'queued',
        queue: {
          name: 'tradera-listings',
          jobId,
          enqueuedAt,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to queue live status check.';
      const reason: TraderaListingStatusCheckBatchReason =
        isTraderaStatusCheckAuthRequiredMessage(message)
          ? 'auth_required'
          : 'queue_failed';
      resultByProductId.set(candidate.productId, {
        productId: candidate.productId,
        listingId: candidate.listing.id,
        status: 'error',
        reason,
        message,
      });
    }
  }

  const results = requestedProductIds
    .map((productId) => resultByProductId.get(productId))
    .filter((result): result is TraderaListingStatusCheckBatchItem => Boolean(result));

  const response: TraderaListingStatusCheckBatchResponse = {
    total: requestedProductIds.length,
    queued: results.filter((result) => result.status === 'queued').length,
    alreadyQueued: results.filter((result) => result.status === 'already_queued').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'error').length,
    reasonCounts: countBatchReasons(results),
    results,
  };

  return NextResponse.json(response);
}
