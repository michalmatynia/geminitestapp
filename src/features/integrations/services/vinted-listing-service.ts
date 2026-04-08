import 'server-only';

import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { runVintedBrowserListing } from './vinted-listing/vinted-browser-listing';
import { isAppError } from '@/shared/errors/app-error';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';
import {
  buildVintedHistoryFields,
  resolveRequestedVintedBrowserMode,
  resolveRequestedVintedBrowserPreference,
  type VintedListingSource,
} from './vinted-listing/vinted-browser-runtime';

export type VintedListingJobInput = {
  listingId: string;
  action: 'list' | 'relist' | 'sync';
  source?: VintedListingSource;
  jobId?: string;
  browserMode?: PlaywrightRelistBrowserMode;
  browserPreference?: PlaywrightBrowserPreference;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const classifyVintedFailure = (message: string): string => {
  const lower = message.toLowerCase();
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

const resolveFailureListingStatus = (errorCategory: string): string =>
  errorCategory === 'AUTH' ? 'auth_required' : 'failed';

const extractVintedErrorMetadata = (error: unknown): Record<string, unknown> | undefined => {
  if (!isAppError(error)) return undefined;
  const metadata = toRecord(error.meta);
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const buildVintedMarketplaceData = ({
  existingMarketplaceData,
  result,
  executedAt,
  action,
  source,
  requestId,
}: {
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  result: Pick<
    Awaited<ReturnType<typeof runVintedListing>>,
    'ok' | 'externalListingId' | 'listingUrl' | 'error' | 'errorCategory' | 'metadata'
  >;
  executedAt: Date;
  action: 'list' | 'relist' | 'sync';
  source: VintedListingSource;
  requestId: string | null;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const vintedData = toRecord(marketplaceData['vinted']);
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
    marketplace: 'vinted',
    ...(nextListingUrl ? { listingUrl: nextListingUrl } : {}),
    ...(nextExternalListingId ? { externalListingId: nextExternalListingId } : {}),
    vinted: {
      ...vintedData,
      lastErrorCategory: result.ok ? null : result.errorCategory,
      pendingExecution: null,
      ...(action === 'sync'
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

export const runVintedListing = async (
  input: VintedListingJobInput
): Promise<{
  ok: boolean;
  externalListingId: string | null;
  listingUrl: string | null;
  error: string | null;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
}> => {
  const { listingId, action = 'list', source = 'manual' } = input;
  let requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  let requestedBrowserPreference: PlaywrightBrowserPreference | undefined;

  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
    if (!resolvedListing) {
      return { ok: false, externalListingId: null, listingUrl: null, error: `Listing not found: ${listingId}`, errorCategory: 'NOT_FOUND' };
    }
    const { listing } = resolvedListing;

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    requestedBrowserMode = resolveRequestedVintedBrowserMode({
      requestedBrowserMode: input.browserMode,
      source,
      connection,
    });
    requestedBrowserPreference = resolveRequestedVintedBrowserPreference({
      requestedBrowserPreference: input.browserPreference,
      source,
      connection,
    });

    const result = await runVintedBrowserListing({
      listing,
      connection,
      source,
      action,
      browserMode: requestedBrowserMode,
      browserPreference: requestedBrowserPreference,
    });

    return {
      ok: true,
      externalListingId: result.externalListingId ?? null,
      listingUrl: result.listingUrl ?? null,
      error: null,
      errorCategory: null,
      metadata: result.metadata,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const category = classifyVintedFailure(message);
    
    void ErrorSystem.captureException(error, {
      service: 'vinted-listing',
      listingId,
      category,
      action,
    });

    return {
      ok: false,
      externalListingId: null,
      listingUrl: null,
      error: message,
      errorCategory: category,
      metadata: {
        ...(extractVintedErrorMetadata(error) ?? {}),
        ...(requestedBrowserMode ? { requestedBrowserMode } : {}),
        ...(requestedBrowserPreference ? { requestedBrowserPreference } : {}),
      },
    };
  }
};

export const processVintedListingJob = async (input: VintedListingJobInput): Promise<void> => {
  const { listingId, action = 'list', source = 'manual', jobId } = input;
  
  // Update status to 'running' during processing
  const preResolved = await findProductListingByIdAcrossProviders(listingId);
  if (preResolved) {
    await preResolved.repository.updateListingStatus(listingId, 'running');
  }

  const result = await runVintedListing(input);
  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (!resolved) {
    if (!result.ok) throw new Error(result.error ?? 'Listing not found');
    return;
  }

  const now = new Date();
  const marketplaceData = buildVintedMarketplaceData({
    existingMarketplaceData: resolved.listing.marketplaceData,
    result,
    executedAt: now,
    action,
    source,
    requestId: jobId ?? null,
  });
  const historyBrowserMode =
    typeof result.metadata?.['browserMode'] === 'string'
      ? result.metadata['browserMode']
      : typeof result.metadata?.['requestedBrowserMode'] === 'string'
        ? result.metadata['requestedBrowserMode']
        : null;
  const historyFields = buildVintedHistoryFields(historyBrowserMode);
  const persistedExternalListingId = resolvePersistedExternalListingId({
    existingExternalListingId: resolved.listing.externalListingId,
    resultExternalListingId: result.externalListingId,
  });

  if (result.ok) {
    await resolved.repository.updateListing(listingId, {
      status: 'active',
      externalListingId: persistedExternalListingId,
      listedAt: now,
      lastStatusCheckAt: now,
      failureReason: null,
      marketplaceData,
    });

    await resolved.repository.appendExportHistory(listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId: persistedExternalListingId,
      failureReason: null,
      relist: action === 'relist',
      requestId: jobId ?? null,
      fields: historyFields,
    });
  } else {
    const failureStatus = resolveFailureListingStatus(result.errorCategory ?? 'UNKNOWN');
    await resolved.repository.updateListingStatus(listingId, failureStatus);
    await resolved.repository.updateListing(listingId, {
      status: failureStatus,
      lastStatusCheckAt: now,
      failureReason: result.error ?? 'Vinted listing failed.',
      marketplaceData,
    });
    
    await resolved.repository.appendExportHistory(listingId, {
      exportedAt: now,
      status: failureStatus,
      failureReason: result.error ?? 'Vinted listing failed.',
      relist: action === 'relist',
      requestId: jobId ?? null,
      fields: historyFields,
    });
    
    throw new Error(result.error ?? 'Vinted listing failed.');
  }
};
