import 'server-only';

/**
 * Tradera Listing Service
 *
 * Orchestrates product listings on Tradera via browser automation (Playwright)
 * or official Tradera API.
 */

export * from './tradera-listing/config';
export * from './tradera-listing/utils';
export * from './tradera-listing/settings';
export * from './tradera-listing/browser';
export * from './tradera-listing/api';
// NOTE: categories.ts is NOT re-exported here because it directly imports `playwright`
// (chromium, devices) at the module level. Including it in this barrel would pull the
// heavyweight playwright external into the BullMQ worker chunk, causing
// "Unexpected token 'export'" at runtime (Turbopack ESM-external resolution issue).
// Import fetchTraderaCategoriesForConnection directly from
// '@/features/integrations/services/tradera-listing/categories' instead.

import { isTraderaApiIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
  listProductListingsByProductIdAcrossProviders,
} from '@/features/integrations/server';
import {
  loadTraderaSystemSettings,
  toTruthyBoolean,
} from '@/features/integrations/services/tradera-system-settings';
import type { TraderaListingJobInput } from '@/shared/contracts/integrations/tradera';
import { isAppError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { TraderaListingJobInput };

import { runTraderaApiListing } from './tradera-listing/api';
import { runTraderaBrowserListing } from './tradera-listing/browser';
import { resolveEffectiveListingSettings, buildRelistPolicy } from './tradera-listing/settings';
import {
  classifyTraderaFailure,
  toUserFacingTraderaFailure,
  resolveExpiry,
  resolveNextRelistAt,
  toRecord,
  resolvePersistedTraderaLinkedTarget,
} from './tradera-listing/utils';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';

const extractErrorMetadata = (error: unknown): Record<string, unknown> | undefined => {
  if (!isAppError(error)) return undefined;
  const metadata = toRecord(error.meta);
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const buildTraderaMarketplaceData = ({
  existingMarketplaceData,
  result,
  executedAt,
  action,
  source,
  requestId,
}: {
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  result: Pick<
    Awaited<ReturnType<typeof runTraderaListing>>,
    'ok' | 'externalListingId' | 'listingUrl' | 'error' | 'errorCategory' | 'metadata'
  >;
  executedAt: Date;
  action: 'list' | 'relist' | 'sync';
  source: 'manual' | 'scheduler' | 'api';
  requestId: string | null;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const nextListingUrl =
    result.listingUrl ??
    (typeof marketplaceData['listingUrl'] === 'string' && marketplaceData['listingUrl'].trim()
      ? marketplaceData['listingUrl']
      : null);
  const nextExternalListingId =
    result.externalListingId ??
    (typeof marketplaceData['externalListingId'] === 'string' &&
    marketplaceData['externalListingId'].trim()
      ? marketplaceData['externalListingId']
      : null);

  return {
    ...marketplaceData,
    marketplace: 'tradera',
    ...(nextListingUrl ? { listingUrl: nextListingUrl } : {}),
    ...(nextExternalListingId ? { externalListingId: nextExternalListingId } : {}),
    tradera: {
      ...traderaData,
      lastErrorCategory: result.ok ? null : result.errorCategory,
      pendingExecution: null,
      ...(action === 'sync' && result.ok
        ? {
            lastSyncedAt: executedAt.toISOString(),
          }
        : {}),
      lastExecution: {
        executedAt: executedAt.toISOString(),
        action,
        source,
        requestId,
        ok: result.ok,
        error: result.error,
        errorCategory: result.errorCategory,
        metadata: result.metadata ?? null,
      },
    },
  };
};

const resolvePersistedExternalListingId = ({
  existingExternalListingId,
  resultExternalListingId,
}: {
  existingExternalListingId: unknown;
  resultExternalListingId: string | null;
}): string | null => {
  if (typeof resultExternalListingId === 'string' && resultExternalListingId.trim()) {
    return resultExternalListingId;
  }

  return typeof existingExternalListingId === 'string' && existingExternalListingId.trim()
    ? existingExternalListingId
    : null;
};

const resolveFailureListingStatus = (errorCategory: string | null): string =>
  errorCategory === 'AUTH' ? 'auth_required' : 'failed';

const resolveRequestedTraderaBrowserMode = ({
  requestedBrowserMode,
  source,
  browserMode,
  playwrightHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  source: 'manual' | 'scheduler' | 'api';
  browserMode: 'builtin' | 'scripted' | null | undefined;
  playwrightHeadless: boolean | null | undefined;
}): PlaywrightRelistBrowserMode => {
  if (requestedBrowserMode) return requestedBrowserMode;
  // Respect the connection's explicit headed/headless preference
  if (playwrightHeadless === false) return 'headed';
  if (playwrightHeadless === true) return 'headless';
  // No explicit preference — legacy default
  return browserMode === 'scripted' && source !== 'scheduler' ? 'headed' : 'connection_default';
};

const buildTraderaHistoryFields = (
  browserMode: string | null | undefined,
  action: 'list' | 'relist' | 'sync'
): string[] | null => {
  const fields: string[] = [];
  const normalizedBrowserMode =
    typeof browserMode === 'string' && browserMode.trim().length > 0 ? browserMode.trim() : null;
  if (normalizedBrowserMode) {
    fields.push(`browser_mode:${normalizedBrowserMode}`);
  }
  if (action === 'sync') {
    fields.push('action:sync');
  }
  return fields.length > 0 ? fields : null;
};

const resolveExistingLinkedTraderaListingCandidate = async ({
  listingId,
  productId,
  connectionId,
}: {
  listingId: string;
  productId: string;
  connectionId: string;
}): Promise<{
  listingId: string;
  externalListingId: string | null;
  listingUrl: string | null;
} | null> => {
  const listings = await listProductListingsByProductIdAcrossProviders(productId);
  const prioritizedCandidates = [
    ...listings.filter((candidate) => candidate.id === listingId),
    ...listings.filter((candidate) => candidate.id !== listingId),
  ];

  for (const candidate of prioritizedCandidates) {
    if (candidate.connectionId !== connectionId) {
      continue;
    }

    const linkedTarget = resolvePersistedTraderaLinkedTarget({
      externalListingId: candidate.externalListingId,
      marketplaceData: candidate.marketplaceData,
    });
    if (!linkedTarget.externalListingId && !linkedTarget.listingUrl) {
      continue;
    }

    return {
      listingId: candidate.id,
      externalListingId: linkedTarget.externalListingId,
      listingUrl: linkedTarget.listingUrl,
    };
  }

  return null;
};

export const runTraderaListing = async (
  input: TraderaListingJobInput
): Promise<{
  ok: boolean;
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: Date | null;
  nextRelistAt: Date | null;
  error: string | null;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
}> => {
  const listingId = input.listingId;
  const source = input.source ?? 'manual';
  const action = input.action ?? 'list';

  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
    if (!resolvedListing) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Listing not found: ${listingId}`,
        errorCategory: 'NOT_FOUND',
      };
    }
    const { listing } = resolvedListing;

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
      };
    }
    const integration = await integrationRepo.getIntegrationById(connection.integrationId);
    if (!integration) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Integration not found: ${connection.integrationId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    const systemSettings = await loadTraderaSystemSettings();
    const integrationSlug = integration.slug;
    const useApi = isTraderaApiIntegrationSlug(integrationSlug);
    if (!useApi && action === 'list') {
      const linkedTraderaListing = await resolveExistingLinkedTraderaListingCandidate({
        listingId: listing.id,
        productId: listing.productId,
        connectionId: listing.connectionId,
      });

      if (linkedTraderaListing) {
        return {
          ok: true,
          externalListingId: linkedTraderaListing.externalListingId,
          listingUrl: linkedTraderaListing.listingUrl,
          expiresAt: null,
          nextRelistAt: null,
          error: null,
          errorCategory: null,
          metadata: {
            duplicateLinked: true,
            duplicateMatchStrategy: 'existing-linked-record',
            latestStage: 'duplicate_linked',
            latestStageUrl: linkedTraderaListing.listingUrl,
            publishVerified: false,
            persistedLinkedListingGuard: true,
            linkedListingId: linkedTraderaListing.listingId,
          },
        };
      }
    }
    const requestedBrowserMode = resolveRequestedTraderaBrowserMode({
      requestedBrowserMode: input.browserMode,
      source,
      browserMode: connection.traderaBrowserMode,
      playwrightHeadless: connection.playwrightHeadless,
    });

    if (useApi) {
      if (action === 'sync') {
        return {
          ok: false,
          externalListingId: null,
          listingUrl: null,
          expiresAt: null,
          nextRelistAt: null,
          error: 'Sync is only supported for Tradera browser listings.',
          errorCategory: 'NOT_FOUND',
        };
      }
      const result = await runTraderaApiListing({ listing, connection });
      const settings = resolveEffectiveListingSettings(listing, connection, systemSettings);
      const expiresAt = resolveExpiry(settings.durationHours);
      const nextRelistAt = resolveNextRelistAt(
        expiresAt,
        settings.autoRelistEnabled,
        settings.autoRelistLeadMinutes
      );

      return {
        ok: true,
        externalListingId: result.externalListingId,
        listingUrl: result.listingUrl ?? null,
        expiresAt,
        nextRelistAt,
        error: null,
        errorCategory: null,
        metadata: {
          ...result.metadata,
          relistPolicy: buildRelistPolicy(settings),
        },
      };
    }

    const browserListingInput = {
      listing,
      connection,
      systemSettings,
      source,
      action,
      browserMode: requestedBrowserMode,
      syncSkipImages: input.syncSkipImages ?? false,
    };
    const result = await runTraderaBrowserListing(browserListingInput);

    const settings = resolveEffectiveListingSettings(listing, connection, systemSettings);
    const expiresAt = resolveExpiry(settings.durationHours);
    const nextRelistAt = resolveNextRelistAt(
      expiresAt,
      settings.autoRelistEnabled,
      settings.autoRelistLeadMinutes
    );

    return {
      ok: true,
      externalListingId: result.externalListingId,
      listingUrl: result.listingUrl ?? null,
      expiresAt,
      nextRelistAt,
      error: null,
      errorCategory: null,
      metadata: {
        ...result.metadata,
        simulated: result.simulated ?? false,
        relistPolicy: buildRelistPolicy(settings),
      },
    };
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    const category = classifyTraderaFailure(message);
    const userMessage = toUserFacingTraderaFailure(category, message);

    void ErrorSystem.captureException(error, {
      service: 'tradera-listing',
      listingId,
      category,
      action,
      source,
      userMessage,
    });

    return {
      ok: false,
      externalListingId: null,
      listingUrl: null,
      expiresAt: null,
      nextRelistAt: null,
      error: userMessage,
      errorCategory: category,
      metadata: extractErrorMetadata(error),
    };
  }
};

export const processTraderaListingJob = async (input: TraderaListingJobInput): Promise<void> => {
  const result = await runTraderaListing(input);
  const resolved = await findProductListingByIdAcrossProviders(input.listingId);
  if (!resolved) {
    if (!result.ok) {
      throw new Error(result.error ?? `Listing not found: ${input.listingId}`);
    }
    return;
  }

  const now = new Date();
  const marketplaceData = buildTraderaMarketplaceData({
    existingMarketplaceData: resolved.listing.marketplaceData,
    result,
    executedAt: now,
    action: input.action ?? 'list',
    source: input.source ?? 'manual',
    requestId: input.jobId ?? null,
  });
  const historyBrowserMode =
    typeof result.metadata?.['browserMode'] === 'string'
      ? result.metadata['browserMode']
      : typeof result.metadata?.['requestedBrowserMode'] === 'string'
        ? result.metadata['requestedBrowserMode']
        : null;
  const action = input.action ?? 'list';
  const historyFields = buildTraderaHistoryFields(historyBrowserMode, action);
  const persistedExternalListingId = resolvePersistedExternalListingId({
    existingExternalListingId: resolved.listing.externalListingId,
    resultExternalListingId: result.externalListingId,
  });
  const duplicateLinked = result.metadata?.['duplicateLinked'] === true;
  const isSyncAction = action === 'sync';
  const persistedListedAt = duplicateLinked
    ? resolved.listing.listedAt ?? null
    : isSyncAction
      ? resolved.listing.listedAt ?? null
      : now;
  const persistedExpiresAt = duplicateLinked
    ? null
    : isSyncAction
      ? resolved.listing.expiresAt ?? null
      : result.expiresAt ?? null;
  const persistedNextRelistAt = duplicateLinked
    ? null
    : isSyncAction
      ? resolved.listing.nextRelistAt ?? null
      : result.nextRelistAt ?? null;
  const persistedLastRelistedAt =
    action === 'relist' ? now : (resolved.listing.lastRelistedAt ?? null);

  if (result.ok) {
    await resolved.repository.updateListingStatus(input.listingId, 'active');
    await resolved.repository.updateListing(input.listingId, {
      status: 'active',
      externalListingId: persistedExternalListingId,
      listedAt: persistedListedAt,
      expiresAt: persistedExpiresAt,
      nextRelistAt: persistedNextRelistAt,
      lastRelistedAt: persistedLastRelistedAt,
      lastStatusCheckAt: now,
      failureReason: null,
      marketplaceData,
    });
    await resolved.repository.appendExportHistory(input.listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId: persistedExternalListingId,
      expiresAt: persistedExpiresAt,
      failureReason: null,
      relist: action === 'relist',
      fields: historyFields,
      requestId: input.jobId ?? null,
    });
    return;
  }

  const failureStatus = resolveFailureListingStatus(result.errorCategory);
  await resolved.repository.updateListingStatus(input.listingId, failureStatus);
  await resolved.repository.updateListing(input.listingId, {
    status: failureStatus,
    lastStatusCheckAt: now,
    nextRelistAt: null,
    failureReason: result.error ?? 'Tradera listing failed.',
    marketplaceData,
  });
  await resolved.repository.appendExportHistory(input.listingId, {
    exportedAt: now,
    status: failureStatus,
    externalListingId: null,
    expiresAt: null,
    failureReason: result.error ?? 'Tradera listing failed.',
    relist: action === 'relist',
    fields: historyFields,
    requestId: input.jobId ?? null,
  });
  throw new Error(result.error ?? 'Tradera listing failed.');
};

const findDueRelistsInMongo = async (limit: number): Promise<string[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const db = await getMongoDb();
  const traderaIntegrations = await db
    .collection<{ _id: string; slug: string }>('integrations')
    .find({ slug: { $regex: /^(tradera|tradera-api)$/i } }, { projection: { _id: 1 } })
    .toArray();
  if (traderaIntegrations.length === 0) return [];

  const now = new Date();
  const listings = await db
    .collection<{
      _id: string;
      integrationId: string;
      status: string;
      nextRelistAt?: Date | null;
    }>('product_listings')
    .find({
      integrationId: { $in: traderaIntegrations.map((i) => i._id) },
      status: { $in: ['active', 'queued_relist'] },
      nextRelistAt: { $ne: null, $lte: now },
    })
    .sort({ nextRelistAt: 1, updatedAt: 1 })
    .limit(limit)
    .toArray();

  return listings.map((listing) => listing._id);
};

export const findDueTraderaRelistListingIds = async (limit: number = 10): Promise<string[]> => {
  return findDueRelistsInMongo(limit);
};

export const shouldRunTraderaRelistScheduler = async (): Promise<boolean> => {
  const settings = await loadTraderaSystemSettings();
  const schedulerEnabled = toTruthyBoolean(
    process.env['TRADERA_RELIST_SCHEDULER_ENABLED'],
    settings.schedulerEnabled
  );
  const autoRelistEnabled = toTruthyBoolean(
    process.env['TRADERA_AUTO_RELIST_ENABLED'],
    settings.autoRelistEnabled
  );
  return schedulerEnabled && autoRelistEnabled;
};
