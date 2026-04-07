import 'server-only';

import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type VintedListingJobInput = {
  listingId: string;
  action: 'list' | 'relist' | 'sync';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
};

export const processVintedListingJob = async (input: VintedListingJobInput): Promise<void> => {
  const { listingId, action, jobId } = input;
  
  try {
    const resolved = await findProductListingByIdAcrossProviders(listingId);
    if (!resolved) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    // Update status to 'running' during processing
    await resolved.repository.updateListingStatus(listingId, 'running');
    
    // Simulate listing process (e.g. browser automation)
    await new Promise(resolve => setTimeout(resolve, 10000));

    await ErrorSystem.logInfo('Vinted listing job processing completed (simulated)', {
      listingId,
      action,
      jobId,
    });

    const now = new Date();
    const externalListingId = `vinted-${Math.floor(Math.random() * 1000000)}`;
    const listingUrl = `https://www.vinted.pl/items/${externalListingId}`;

    await resolved.repository.updateListing(listingId, {
      status: 'active',
      externalListingId,
      listedAt: now,
      lastStatusCheckAt: now,
      failureReason: null,
      marketplaceData: {
        marketplace: 'vinted',
        listingUrl,
        vinted: {
          lastExecution: {
            executedAt: now.toISOString(),
            action,
            source: input.source ?? 'manual',
            requestId: jobId ?? null,
            ok: true,
          },
        },
      },
    });

    await resolved.repository.appendExportHistory(listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId,
      failureReason: null,
      relist: action === 'relist',
      requestId: jobId ?? null,
    });

  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    const resolved = await findProductListingByIdAcrossProviders(listingId);
    if (resolved) {
      await resolved.repository.updateListing(listingId, {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Vinted listing failed.',
      });
    }
    throw error;
  }
};
