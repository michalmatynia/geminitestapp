import 'server-only';

import { 
  findProductListingByIdAcrossProviders, 
  getIntegrationRepository 
} from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { runVintedBrowserListing } from './vinted-listing/vinted-browser-listing';
import { isAppError } from '@/shared/errors/app-error';

export type VintedListingJobInput = {
  listingId: string;
  action: 'list' | 'relist' | 'sync';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
};

const classifyVintedFailure = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('auth_required') || lower.includes('login') || lower.includes('session expired')) return 'AUTH';
  if (lower.includes('selector') || lower.includes('field not found')) return 'SELECTOR';
  if (lower.includes('timeout') || lower.includes('navigation')) return 'NAVIGATION';
  return 'UNKNOWN';
};

const resolveFailureListingStatus = (errorCategory: string): string =>
  errorCategory === 'AUTH' ? 'auth_required' : 'failed';

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

  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
    if (!resolvedListing) {
      return { ok: false, externalListingId: null, listingUrl: null, error: `Listing not found: ${listingId}`, errorCategory: 'NOT_FOUND' };
    }
    const { listing } = resolvedListing;

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
       return { ok: false, externalListingId: null, listingUrl: null, error: `Connection not found: ${listing.connectionId}`, errorCategory: 'NOT_FOUND' };
    }

    const result = await runVintedBrowserListing({
      listing,
      connection,
      source,
      action,
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
      metadata: isAppError(error) ? (error.meta as Record<string, unknown>) : undefined,
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
  if (result.ok) {
    await resolved.repository.updateListing(listingId, {
      status: 'active',
      externalListingId: result.externalListingId,
      listedAt: now,
      lastStatusCheckAt: now,
      failureReason: null,
      marketplaceData: {
        marketplace: 'vinted',
        listingUrl: result.listingUrl,
        externalListingId: result.externalListingId,
        vinted: {
          lastExecution: {
            executedAt: now.toISOString(),
            action,
            source,
            requestId: jobId ?? null,
            ok: true,
            metadata: result.metadata,
          },
        },
      },
    });

    await resolved.repository.appendExportHistory(listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId: result.externalListingId,
      failureReason: null,
      relist: action === 'relist',
      requestId: jobId ?? null,
    });
  } else {
    const failureStatus = resolveFailureListingStatus(result.errorCategory ?? 'UNKNOWN');
    await resolved.repository.updateListingStatus(listingId, failureStatus);
    await resolved.repository.updateListing(listingId, {
      status: failureStatus,
      lastStatusCheckAt: now,
      failureReason: result.error ?? 'Vinted listing failed.',
    });
    
    await resolved.repository.appendExportHistory(listingId, {
      exportedAt: now,
      status: failureStatus,
      failureReason: result.error ?? 'Vinted listing failed.',
      relist: action === 'relist',
      requestId: jobId ?? null,
    });
    
    throw new Error(result.error ?? 'Vinted listing failed.');
  }
};
