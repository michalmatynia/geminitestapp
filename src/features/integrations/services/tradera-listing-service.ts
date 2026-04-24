import 'server-only';

/**
 * Tradera Listing Service
 *
 * Orchestrates product listings on Tradera via browser automation (Playwright).
 */

export * from './tradera-listing/config';
export * from './tradera-listing/utils';
export * from './tradera-listing/settings';
export * from './tradera-listing/browser';
// NOTE: categories.ts is NOT re-exported here because it directly imports `playwright`
// (chromium, devices) at the module level. Including it in this barrel would pull the
// heavyweight playwright external into the BullMQ worker chunk, causing
// "Unexpected token 'export'" at runtime (Turbopack ESM-external resolution issue).
// Import fetchTraderaCategoriesForConnection directly from
// '@/features/integrations/services/tradera-listing/categories' instead.

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
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { TraderaListingJobInput };

import {
  runTraderaBrowserListing,
  runTraderaBrowserCheckStatus,
  runTraderaBrowserMoveToUnsold,
} from './tradera-listing/browser';
import { resolveEffectiveListingSettings, buildRelistPolicy } from './tradera-listing/settings';
import {
  classifyTraderaFailure,
  extractTraderaFailureMetadata,
  toUserFacingTraderaFailure,
  resolveExpiry,
  resolveNextRelistAt,
  resolvePersistedTraderaLinkedTarget,
} from './tradera-listing/utils';
import {
  buildPlaywrightListingHistoryFields,
  buildPlaywrightServiceListingCaughtFailure,
  finalizePlaywrightListingStatusCheckOutcome,
  finalizePlaywrightStandardListingJobOutcome,
  buildPlaywrightMarketplaceListingProcessArtifacts,
  resolvePlaywrightListingPersistenceContextAfterRun,
  buildPlaywrightServiceListingFailure,
  buildPlaywrightServiceListingMissingContextFailure,
  buildPlaywrightServiceListingSuccess,
  resolvePlaywrightFailureListingStatus,
  resolvePlaywrightListingRunContext,
  type PlaywrightServiceListingExecutionBase,
} from '@/features/playwright/server';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';

const resolveRequestedTraderaBrowserMode = ({
  requestedBrowserMode,
  source,
  browserMode,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  source: 'manual' | 'scheduler' | 'api';
  browserMode: 'builtin' | 'scripted' | null | undefined;
}): PlaywrightRelistBrowserMode => {
  if (requestedBrowserMode) return requestedBrowserMode;
  // No explicit override. Scripted Tradera runs still default to a real browser
  // outside scheduler-triggered automation; otherwise defer to the Playwright action.
  return browserMode === 'scripted' && source !== 'scheduler' ? 'headed' : 'connection_default';
};

const buildTraderaHistoryFields = (
  browserMode: string | null | undefined,
  action: 'list' | 'relist' | 'sync' | 'check_status' | 'move_to_unsold'
): string[] | null =>
  buildPlaywrightListingHistoryFields({
    browserMode,
    extraFields:
      action === 'sync'
        ? ['action:sync']
        : action === 'move_to_unsold'
          ? ['action:move_to_unsold']
          : undefined,
  });

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildPendingTraderaRunMarketplaceData = ({
  existingMarketplaceData,
  action,
  requestedBrowserMode,
  requestedSelectorProfile,
  requestId,
  runId,
}: {
  existingMarketplaceData: unknown;
  action: 'list' | 'relist' | 'sync' | 'check_status' | 'move_to_unsold';
  requestedBrowserMode: PlaywrightRelistBrowserMode;
  requestedSelectorProfile?: string;
  requestId: string | null;
  runId: string;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const pendingSelectorProfile =
    typeof pendingExecution['requestedSelectorProfile'] === 'string' &&
    pendingExecution['requestedSelectorProfile'].trim().length > 0
      ? pendingExecution['requestedSelectorProfile'].trim()
      : null;

  return {
    ...marketplaceData,
    marketplace: 'tradera',
    tradera: {
      ...traderaData,
      pendingExecution: {
        action,
        requestedBrowserMode,
        ...((requestedSelectorProfile ?? pendingSelectorProfile)
          ? {
              requestedSelectorProfile:
                requestedSelectorProfile ?? pendingSelectorProfile,
            }
          : {}),
        requestId,
        queuedAt:
          typeof pendingExecution['queuedAt'] === 'string' && pendingExecution['queuedAt'].trim().length > 0
            ? pendingExecution['queuedAt']
            : new Date().toISOString(),
        runId,
      },
    },
  };
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
    const integrationRepository = await getIntegrationRepository();
    const runContext = await resolvePlaywrightListingRunContext({
      listingId,
      includeIntegration: true,
      dependencies: {
        findListingById: findProductListingByIdAcrossProviders,
        getConnectionById: integrationRepository.getConnectionById.bind(integrationRepository),
        getIntegrationById: integrationRepository.getIntegrationById.bind(integrationRepository),
      },
    });
    if (!runContext.ok) {
      return buildPlaywrightServiceListingMissingContextFailure({
        context: runContext,
        extra: {
          expiresAt: null,
          nextRelistAt: null,
        },
      });
    }

    const { listing, connection, integration, repository } = runContext;

    const systemSettings = await loadTraderaSystemSettings();
    const requestedSelectorProfile =
      typeof input.selectorProfile === 'string' && input.selectorProfile.trim().length > 0
        ? input.selectorProfile.trim()
        : null;
    if (requestedSelectorProfile) {
      systemSettings.selectorProfile = requestedSelectorProfile;
    }
    if (action === 'list') {
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
    const requestedBrowserMode = resolveRequestedTraderaBrowserMode({
      requestedBrowserMode: input.browserMode,
      source,
      browserMode: connection.traderaBrowserMode,
    });
    const persistPendingRunId = async (runId: string): Promise<void> => {
      try {
        const nextMarketplaceData = buildPendingTraderaRunMarketplaceData({
          existingMarketplaceData: listing.marketplaceData,
          action,
          requestedBrowserMode,
          ...(requestedSelectorProfile ? { requestedSelectorProfile } : {}),
          requestId: input.jobId ?? null,
          runId,
        });
        listing.marketplaceData = nextMarketplaceData as typeof listing.marketplaceData;
        await repository.updateListing(listing.id, {
          marketplaceData: nextMarketplaceData,
        });
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: 'tradera-listing',
          listingId: listing.id,
          action,
          source,
          runId,
          phase: 'persist-pending-run-id',
        });
      }
    };

    // check_status: lightweight browser status read — no listing action, no API path
    if (action === 'check_status') {
      const checkResult = await runTraderaBrowserCheckStatus({
        listing,
        connection,
        systemSettings,
        browserMode: requestedBrowserMode,
      }, {
        onRunStarted: persistPendingRunId,
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

    if (action === 'move_to_unsold') {
      const moveToUnsoldResult = await runTraderaBrowserMoveToUnsold({
        listing,
        connection,
        systemSettings,
        browserMode: requestedBrowserMode,
      }, {
        onRunStarted: persistPendingRunId,
      });

      const resolvedMoveToUnsoldStatus =
        typeof moveToUnsoldResult.metadata?.['checkedStatus'] === 'string' &&
        moveToUnsoldResult.metadata['checkedStatus'].trim()
          ? moveToUnsoldResult.metadata['checkedStatus'].trim()
          : 'ended';
      let mergedMetadata: Record<string, unknown> = {
        ...(moveToUnsoldResult.metadata ?? {}),
        checkedStatus: resolvedMoveToUnsoldStatus,
      };

      try {
        const checkResult = await runTraderaBrowserCheckStatus({
          listing,
          connection,
          systemSettings,
          browserMode: requestedBrowserMode,
        });
        const verifiedStatus =
          typeof checkResult.metadata?.['checkedStatus'] === 'string' &&
          checkResult.metadata['checkedStatus'].trim()
            ? checkResult.metadata['checkedStatus'].trim()
            : null;

        mergedMetadata = {
          ...(moveToUnsoldResult.metadata ?? {}),
          ...(checkResult.metadata ?? {}),
          moveToUnsoldRunId:
            typeof moveToUnsoldResult.metadata?.['runId'] === 'string'
              ? moveToUnsoldResult.metadata['runId']
              : null,
          moveToUnsoldVerificationMethod:
            typeof moveToUnsoldResult.metadata?.['verificationMethod'] === 'string'
              ? moveToUnsoldResult.metadata['verificationMethod']
              : null,
          moveToUnsoldVerifiedInUnsold:
            moveToUnsoldResult.metadata?.['verifiedInUnsold'] === true,
          checkedStatus: verifiedStatus ?? resolvedMoveToUnsoldStatus,
        };
      } catch (verificationError) {
        void ErrorSystem.captureException(verificationError, {
          service: 'tradera-listing',
          listingId: listing.id,
          action,
          source,
          phase: 'post-move-status-check',
        });
      }

      return buildPlaywrightServiceListingSuccess({
        externalListingId:
          moveToUnsoldResult.externalListingId ?? listing.externalListingId ?? null,
        listingUrl: moveToUnsoldResult.listingUrl ?? null,
        metadata: mergedMetadata,
        extra: {
          expiresAt: null,
          nextRelistAt: null,
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
    const result = await runTraderaBrowserListing(browserListingInput, {
      onRunStarted: persistPendingRunId,
    });

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
    const failureMetadata = extractTraderaFailureMetadata(message);

    void ErrorSystem.captureException(error, {
      service: 'tradera-listing',
      listingId,
      category,
      action,
      source,
      userMessage,
    });

    return buildPlaywrightServiceListingCaughtFailure({
      error,
      errorMessage: userMessage,
      errorCategory: category,
      ...(Object.keys(failureMetadata).length > 0 ? { metadata: failureMetadata } : {}),
      extra: {
        expiresAt: null,
        nextRelistAt: null,
      },
    });
  }
};

export const processTraderaListingJob = async (input: TraderaListingJobInput): Promise<void> => {
  const result = await runTraderaListing(input);
  const persistenceContext = await resolvePlaywrightListingPersistenceContextAfterRun({
    listingId: input.listingId,
    result,
    dependencies: {
      findListingById: findProductListingByIdAcrossProviders,
    },
    allowMissingOnSuccess: false,
    missingErrorMessage: `Listing not found after job execution: ${input.listingId}`,
  });
  if (!persistenceContext) {
    throw new Error(`Listing not found after job execution: ${input.listingId}`);
  }

  const now = new Date();
  const { listing, repository } = persistenceContext;
  const action = input.action ?? 'list';
  const source = input.source ?? 'manual';
  const {
    marketplaceData,
    historyBrowserMode,
    persistedExternalListingId,
  } = buildPlaywrightMarketplaceListingProcessArtifacts({
    executedAt: now,
    existingMarketplaceData: listing.marketplaceData,
    existingExternalListingId: listing.externalListingId,
    marketplace: 'tradera',
    providerKey: 'tradera',
    result,
    requestId: input.jobId ?? null,
    lastExecutionExtra: {
      action,
      source,
    },
    providerState: {
      ...(action === 'sync' && result.ok
        ? { lastSyncedAt: now.toISOString() }
        : {}),
      ...((action === 'check_status' || action === 'move_to_unsold') && result.ok
        ? { lastStatusCheckAt: now.toISOString() }
        : {}),
    },
  });
  const historyFields = buildTraderaHistoryFields(historyBrowserMode, action);
  const duplicateMatchStrategy =
    typeof result.metadata?.['duplicateMatchStrategy'] === 'string' &&
    result.metadata['duplicateMatchStrategy'].trim()
      ? result.metadata['duplicateMatchStrategy'].trim()
      : null;
  const latestStage =
    typeof result.metadata?.['latestStage'] === 'string' && result.metadata['latestStage'].trim()
      ? result.metadata['latestStage'].trim()
      : null;
  const duplicateLinked =
    result.metadata?.['duplicateLinked'] === true ||
    duplicateMatchStrategy !== null ||
    latestStage === 'duplicate_linked';
  const isSyncAction = action === 'sync';
  const isMoveToUnsoldAction = action === 'move_to_unsold';
  const persistedListedAt = duplicateLinked
    ? listing.listedAt ?? null
    : isSyncAction || isMoveToUnsoldAction
      ? listing.listedAt ?? null
      : now;
  const persistedExpiresAt = duplicateLinked
    ? null
    : isSyncAction
      ? listing.expiresAt ?? null
      : isMoveToUnsoldAction
        ? null
      : result.expiresAt ?? null;
  const persistedNextRelistAt = duplicateLinked
    ? null
    : isSyncAction
      ? listing.nextRelistAt ?? null
      : isMoveToUnsoldAction
        ? null
      : result.nextRelistAt ?? null;
  const persistedLastRelistedAt =
    action === 'relist' ? now : (listing.lastRelistedAt ?? null);

  if (result.ok) {
    // check_status: only update lastStatusCheckAt and the resolved status — do not touch listedAt/expiresAt
    if (action === 'check_status') {
      const checkedStatus =
        typeof result.metadata?.['checkedStatus'] === 'string' && result.metadata['checkedStatus'].trim()
          ? result.metadata['checkedStatus'].trim()
          : null;
      const statusToWrite = checkedStatus ?? listing.status ?? 'unknown';
      await finalizePlaywrightListingStatusCheckOutcome({
        repository,
        listingId: input.listingId,
        result,
        at: now,
        marketplaceData,
        statusOnSuccess: statusToWrite,
        failureMessage: 'Tradera live status check failed.',
      });
      return;
    }

    if (action === 'move_to_unsold') {
      const checkedStatus =
        typeof result.metadata?.['checkedStatus'] === 'string' &&
        result.metadata['checkedStatus'].trim()
          ? result.metadata['checkedStatus'].trim()
          : 'ended';
      await finalizePlaywrightStandardListingJobOutcome({
        repository,
        listingId: input.listingId,
        result,
        at: now,
        marketplaceData,
        relist: false,
        requestId: input.jobId ?? null,
        historyFields,
        success: {
          historyStatus: checkedStatus,
          externalListingId: persistedExternalListingId,
          expiresAt: null,
          updateExtra: {
            status: checkedStatus,
            listedAt: persistedListedAt,
            expiresAt: null,
            nextRelistAt: null,
            lastRelistedAt: persistedLastRelistedAt,
            lastStatusCheckAt: now,
          },
        },
        failure: {
          historyStatus: resolvePlaywrightFailureListingStatus(result.errorCategory),
          failureReason: 'Tradera end listing failed.',
          updateExtra: {
            status: resolvePlaywrightFailureListingStatus(result.errorCategory),
            nextRelistAt: null,
          },
        },
      });
      return;
    }
  }

  // check_status failure: do not overwrite the listing status — just record the error metadata
  if (action === 'check_status') {
    await finalizePlaywrightListingStatusCheckOutcome({
      repository,
      listingId: input.listingId,
      result,
      at: now,
      marketplaceData,
      failureMessage: 'Tradera live status check failed.',
    });
  }

  const failureStatus = resolvePlaywrightFailureListingStatus(result.errorCategory);
  await finalizePlaywrightStandardListingJobOutcome({
    repository,
    listingId: input.listingId,
    result,
    at: now,
    marketplaceData,
    relist: action === 'relist',
    requestId: input.jobId ?? null,
    historyFields,
    success: {
      historyStatus: 'active',
      externalListingId: persistedExternalListingId,
      expiresAt: persistedExpiresAt,
      updateExtra: {
        status: 'active',
        listedAt: persistedListedAt,
        expiresAt: persistedExpiresAt,
        nextRelistAt: persistedNextRelistAt,
        lastRelistedAt: persistedLastRelistedAt,
      },
    },
    failure: {
      historyStatus: failureStatus,
      failureReason: 'Tradera listing failed.',
      updateExtra: {
        status: failureStatus,
        nextRelistAt: null,
      },
    },
  });
};

const findDueRelistsInMongo = async (limit: number): Promise<string[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const db = await getMongoDb();
  const traderaIntegrations = await db
    .collection<{ _id: string; slug: string }>('integrations')
    .find({ slug: { $regex: /^tradera$/i } }, { projection: { _id: 1 } })
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
