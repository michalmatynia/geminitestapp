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
  listProductListingsByProductIdAcrossProviders,
} from '@/features/integrations/services/product-listing-repository';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
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
import { runTraderaBrowserListing, runTraderaBrowserCheckStatus } from './tradera-listing/browser';
import { resolveEffectiveListingSettings, buildRelistPolicy } from './tradera-listing/settings';
import {
  classifyTraderaFailure,
  toUserFacingTraderaFailure,
  resolveExpiry,
  resolveNextRelistAt,
  toRecord,
  resolvePersistedTraderaLinkedTarget,
} from './tradera-listing/utils';
import {
  buildPlaywrightListingLastExecutionRecord,
  buildPlaywrightListingMarketplaceDataRecord,
  buildPlaywrightServiceListingFailure,
  buildPlaywrightServiceListingSuccess,
  resolveConnectionPlaywrightSettingsProfile,
  type PlaywrightServiceListingExecutionBase,
} from '@/features/playwright/server';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';

const extractErrorMetadata = (error: unknown): Record<string, unknown> | undefined => {
  if (!isAppError(error)) return undefined;
  const metadata = toRecord(error.meta);
  return Object.keys(metadata).length > 0 ? metadata : undefined;
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
  action,
  browserMode,
  playwrightHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync' | 'check_status';
  browserMode: 'builtin' | 'scripted' | null | undefined;
  playwrightHeadless: boolean | null | undefined;
}): PlaywrightRelistBrowserMode => {
  if (requestedBrowserMode) return requestedBrowserMode;
  if (action === 'check_status') return 'headless';
  // Respect the connection's explicit headed/headless preference
  if (playwrightHeadless === false) return 'headed';
  if (playwrightHeadless === true) return 'headless';
  // No explicit preference — legacy default
  return browserMode === 'scripted' && source !== 'scheduler' ? 'headed' : 'connection_default';
};

const buildTraderaHistoryFields = (
  browserMode: string | null | undefined,
  action: 'list' | 'relist' | 'sync' | 'check_status'
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
): Promise<
  PlaywrightServiceListingExecutionBase & {
    expiresAt: Date | null;
    nextRelistAt: Date | null;
  }
> => {
  const listingId = input.listingId;
  const source = input.source ?? 'manual';
  const action = input.action ?? 'list';

  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
    if (!resolvedListing) {
      return buildPlaywrightServiceListingFailure({
        error: `Listing not found: ${listingId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
          nextRelistAt: null,
        },
      });
    }
    const { listing } = resolvedListing;

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return buildPlaywrightServiceListingFailure({
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
          nextRelistAt: null,
        },
      });
    }
    const integration = await integrationRepo.getIntegrationById(connection.integrationId);
    if (!integration) {
      return buildPlaywrightServiceListingFailure({
        error: `Integration not found: ${connection.integrationId}`,
        errorCategory: 'NOT_FOUND',
        extra: {
          expiresAt: null,
          nextRelistAt: null,
        },
      });
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
        return buildPlaywrightServiceListingSuccess({
          externalListingId: linkedTraderaListing.externalListingId,
          listingUrl: linkedTraderaListing.listingUrl,
          metadata: {
            duplicateLinked: true,
            duplicateMatchStrategy: 'existing-linked-record',
            latestStage: 'duplicate_linked',
            latestStageUrl: linkedTraderaListing.listingUrl,
            publishVerified: false,
            persistedLinkedListingGuard: true,
            linkedListingId: linkedTraderaListing.listingId,
          },
          extra: {
            expiresAt: null,
            nextRelistAt: null,
          },
        });
      }
    }
    const resolvedPlaywrightSettings = await resolveConnectionPlaywrightSettingsProfile(connection);
    const requestedBrowserMode = resolveRequestedTraderaBrowserMode({
      requestedBrowserMode: input.browserMode,
      source,
      action,
      browserMode: connection.traderaBrowserMode,
      playwrightHeadless: resolvedPlaywrightSettings.hasExplicitHeadlessPreference
        ? resolvedPlaywrightSettings.settings.headless
        : undefined,
    });

    // check_status: lightweight browser status read — no listing action, no API path
    if (action === 'check_status') {
      const checkResult = await runTraderaBrowserCheckStatus({
        listing,
        connection,
        browserMode: requestedBrowserMode,
      });
      return buildPlaywrightServiceListingSuccess({
        externalListingId: checkResult.externalListingId ?? null,
        listingUrl: checkResult.listingUrl ?? null,
        metadata: checkResult.metadata,
        extra: {
          expiresAt: null,
          nextRelistAt: null,
        },
      });
    }

    if (useApi) {
      if (action === 'sync') {
        return buildPlaywrightServiceListingFailure({
          error: 'Sync is only supported for Tradera browser listings.',
          errorCategory: 'NOT_FOUND',
          extra: {
            expiresAt: null,
            nextRelistAt: null,
          },
        });
      }
      const result = await runTraderaApiListing({ listing, connection });
      const settings = resolveEffectiveListingSettings(listing, connection, systemSettings);
      const expiresAt = resolveExpiry(settings.durationHours);
      const nextRelistAt = resolveNextRelistAt(
        expiresAt,
        settings.autoRelistEnabled,
        settings.autoRelistLeadMinutes
      );

      return buildPlaywrightServiceListingSuccess({
        externalListingId: result.externalListingId,
        listingUrl: result.listingUrl ?? null,
        metadata: {
          ...result.metadata,
          relistPolicy: buildRelistPolicy(settings),
        },
        extra: {
          expiresAt,
          nextRelistAt,
        },
      });
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

    return buildPlaywrightServiceListingSuccess({
      externalListingId: result.externalListingId,
      listingUrl: result.listingUrl ?? null,
      metadata: {
        ...result.metadata,
        simulated: result.simulated ?? false,
        relistPolicy: buildRelistPolicy(settings),
      },
      extra: {
        expiresAt,
        nextRelistAt,
      },
    });
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

    return buildPlaywrightServiceListingFailure({
      error: userMessage,
      errorCategory: category,
      metadata: extractErrorMetadata(error),
      extra: {
        expiresAt: null,
        nextRelistAt: null,
      },
    });
  }
};

export const processTraderaListingJob = async (input: TraderaListingJobInput): Promise<void> => {
  const result = await runTraderaListing(input);
  const resolved = await findProductListingByIdAcrossProviders(input.listingId);
  if (!resolved) {
    throw new Error(result.error ?? `Listing not found after job execution: ${input.listingId}`);
  }

  const now = new Date();
  const action = input.action ?? 'list';
  const source = input.source ?? 'manual';
  const lastExecution = buildPlaywrightListingLastExecutionRecord({
    executedAt: now,
    result,
    requestId: input.jobId ?? null,
    metadata: result.metadata ?? null,
    extra: {
      action,
      source,
    },
  });
  const marketplaceData = buildPlaywrightListingMarketplaceDataRecord({
    existingMarketplaceData: resolved.listing.marketplaceData,
    marketplace: 'tradera',
    providerKey: 'tradera',
    result,
    lastExecution,
    providerState: {
      ...(action === 'sync' && result.ok
        ? { lastSyncedAt: now.toISOString() }
        : {}),
      ...(action === 'check_status' && result.ok
        ? { lastStatusCheckAt: now.toISOString() }
        : {}),
    },
  });
  const historyBrowserMode =
    typeof result.metadata?.['browserMode'] === 'string'
      ? result.metadata['browserMode']
      : typeof result.metadata?.['requestedBrowserMode'] === 'string'
        ? result.metadata['requestedBrowserMode']
        : null;
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
    // check_status: only update lastStatusCheckAt and the resolved status — do not touch listedAt/expiresAt
    if (action === 'check_status') {
      const checkedStatus =
        typeof result.metadata?.['checkedStatus'] === 'string' && result.metadata['checkedStatus'].trim()
          ? result.metadata['checkedStatus'].trim()
          : null;
      const statusToWrite = checkedStatus ?? resolved.listing.status ?? 'unknown';
      await resolved.repository.updateListing(input.listingId, {
        status: statusToWrite,
        lastStatusCheckAt: now,
        marketplaceData,
      });
      return;
    }

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

  // check_status failure: do not overwrite the listing status — just record the error metadata
  if (action === 'check_status') {
    await resolved.repository.updateListing(input.listingId, {
      lastStatusCheckAt: now,
      marketplaceData,
    });
    throw new Error(result.error ?? 'Tradera live status check failed.');
  }

  const failureStatus = resolveFailureListingStatus(result.errorCategory);
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
