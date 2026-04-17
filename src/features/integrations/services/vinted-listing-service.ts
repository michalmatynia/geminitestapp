import 'server-only';

import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import { runVintedBrowserListing } from './vinted-listing/vinted-browser-listing';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';
import {
  resolveRequestedVintedBrowserMode,
  resolveRequestedVintedBrowserPreference,
  type VintedListingSource,
} from './vinted-listing/vinted-browser-runtime';
import {
  buildPlaywrightListingHistoryFields,
  buildPlaywrightMarketplaceListingProcessArtifacts,
  buildPlaywrightServiceListingCaughtFailure,
  buildPlaywrightServiceListingMissingContextFailure,
  buildPlaywrightServiceListingSuccess,
  finalizePlaywrightStandardListingJobOutcome,
  resolvePlaywrightFailureListingStatus,
  resolvePlaywrightListingPersistenceContext,
  resolvePlaywrightListingPersistenceContextAfterRun,
  resolvePlaywrightListingRunContext,
  type PlaywrightServiceListingExecutionBase,
} from '@/features/playwright/server';

export type VintedListingJobInput = {
  listingId: string;
  action: 'list' | 'relist' | 'sync';
  source?: VintedListingSource;
  jobId?: string;
  browserMode?: PlaywrightRelistBrowserMode;
  browserPreference?: PlaywrightBrowserPreference;
};

export type VintedListingExecutionResult = PlaywrightServiceListingExecutionBase;

const classifyVintedFailure = (message: string): string => {
  const lower = message.toLowerCase();
  if (
    lower.includes('mapping required') ||
    lower.includes('could not be selected in the listing form') ||
    lower.includes('category mapping') ||
    lower.includes('condition mapping') ||
    lower.includes('size mapping') ||
    lower.includes('brand mapping')
  ) {
    return 'MAPPING';
  }
  if (
    lower.includes('publish verification') ||
    lower.includes('submit button') ||
    lower.includes('required field')
  ) {
    return 'FORM';
  }
  if (
    lower.includes('auth_required') ||
    lower.includes('login') ||
    lower.includes('session expired')
  ) {
    return 'AUTH';
  }
  if (lower.includes('captcha') || lower.includes('manual verification')) return 'AUTH';
  if (lower.includes('selector') || lower.includes('field not found')) return 'SELECTOR';
  if (lower.includes('timeout') || lower.includes('navigation')) return 'NAVIGATION';
  return 'UNKNOWN';
};

export const runVintedListing = async (
  input: VintedListingJobInput
): Promise<VintedListingExecutionResult> => {
  const { listingId, action = 'list', source = 'manual' } = input;
  let requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  let requestedBrowserPreference: PlaywrightBrowserPreference | undefined;

  try {
    const integrationRepository = await getIntegrationRepository();
    const runContext = await resolvePlaywrightListingRunContext({
      listingId,
      dependencies: {
        findListingById: findProductListingByIdAcrossProviders,
        getConnectionById: integrationRepository.getConnectionById.bind(integrationRepository),
        getIntegrationById: integrationRepository.getIntegrationById.bind(integrationRepository),
      },
    });
    if (!runContext.ok) {
      return buildPlaywrightServiceListingMissingContextFailure({
        context: runContext,
      });
    }
    const { listing, connection } = runContext;
    requestedBrowserMode = resolveRequestedVintedBrowserMode({
      requestedBrowserMode: input.browserMode,
      source,
    });
    requestedBrowserPreference = resolveRequestedVintedBrowserPreference({
      requestedBrowserPreference: input.browserPreference,
      source,
    });

    const result = await runVintedBrowserListing({
      listing,
      connection,
      source,
      action,
      browserMode: requestedBrowserMode,
      browserPreference: requestedBrowserPreference,
    });

    return buildPlaywrightServiceListingSuccess({
      externalListingId: result.externalListingId ?? null,
      listingUrl: result.listingUrl ?? null,
      metadata: result.metadata,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const category = classifyVintedFailure(message);
    
    void ErrorSystem.captureException(error, {
      service: 'vinted-listing',
      listingId,
      category,
      action,
    });

    return buildPlaywrightServiceListingCaughtFailure({
      error,
      errorMessage: message,
      errorCategory: category,
      metadata: {
        ...(requestedBrowserMode ? { requestedBrowserMode } : {}),
        ...(requestedBrowserPreference ? { requestedBrowserPreference } : {}),
      },
    });
  }
};

export const processVintedListingJob = async (input: VintedListingJobInput): Promise<void> => {
  const { listingId, action = 'list', source = 'manual', jobId } = input;
  
  // Update status to 'running' during processing
  const prePersistenceContext = await resolvePlaywrightListingPersistenceContext({
    listingId,
    dependencies: {
      findListingById: findProductListingByIdAcrossProviders,
    },
  });
  if (prePersistenceContext.found) {
    await prePersistenceContext.repository.updateListingStatus(listingId, 'running');
  }

  const result = await runVintedListing(input);
  const persistenceContext = await resolvePlaywrightListingPersistenceContextAfterRun({
    listingId,
    result,
    dependencies: {
      findListingById: findProductListingByIdAcrossProviders,
    },
    missingErrorMessage: 'Listing not found',
  });
  if (!persistenceContext) {
    return;
  }

  const now = new Date();
  const { listing, repository } = persistenceContext;
  const {
    marketplaceData,
    historyBrowserMode,
    persistedExternalListingId,
  } = buildPlaywrightMarketplaceListingProcessArtifacts({
    executedAt: now,
    existingMarketplaceData: listing.marketplaceData,
    existingExternalListingId: listing.externalListingId,
    marketplace: 'vinted',
    providerKey: 'vinted',
    result,
    requestId: jobId ?? null,
    lastExecutionExtra: {
      action,
      source,
    },
    providerState:
      action === 'sync'
        ? {
            lastSyncedAt: now.toISOString(),
          }
        : undefined,
  });
  const historyFields = buildPlaywrightListingHistoryFields({
    browserMode: historyBrowserMode,
  });
  const failureStatus = resolvePlaywrightFailureListingStatus(result.errorCategory);

  await finalizePlaywrightStandardListingJobOutcome({
    repository,
    listingId,
    result,
    at: now,
    marketplaceData,
    relist: action === 'relist',
    requestId: jobId ?? null,
    historyFields,
    success: {
      historyStatus: 'active',
      externalListingId: persistedExternalListingId,
      updateExtra: {
        status: 'active',
        listedAt: now,
      },
    },
    failure: {
      transitionStatus: failureStatus,
      historyStatus: failureStatus,
      failureReason: 'Vinted listing failed.',
      updateExtra: {
        status: failureStatus,
      },
    },
  });
};
