export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { auth } from '@/features/auth/server';
import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { deleteBaseProduct } from '@/features/integrations/server';
import { decryptSecret } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const deleteSchema = z.object({
  inventoryId: z.string().min(1).optional()
});

const BASE_DELETE_RUN_PATH_ID = 'integration-base-delete';
const BASE_DELETE_RUN_PATH_NAME = 'Base.com Deletion Jobs';
const BASE_DELETE_SOURCE = 'integration_base_delete';

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; listingId: string }): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }
  const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
  if (resolvedListing?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { listingId, productId });
  }
  const repo = resolvedListing.repository;
  const listing = resolvedListing.listing;

  const parsed = await parseJsonBody(_req, deleteSchema, {
    logPrefix: 'integrations.products.listings.DELETE_FROM_BASE',
    allowEmpty: true
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  // Try to find inventoryId from multiple sources (in order of priority):
  // 1. Request body (explicit override)
  // 2. Listing's stored inventoryId
  // 3. Export history (most recent entry with inventoryId)
  // 4. Connection's baseLastInventoryId (fallback)
  let inventoryId =
    data.inventoryId ||
    listing.inventoryId ||
    listing.exportHistory
      ?.slice()
      .reverse()
      .find((event) => event.inventoryId)?.inventoryId ||
    null;

  // If still no inventoryId, try to get it from the connection's baseLastInventoryId
  if (!inventoryId) {
    const integrationRepo = await getIntegrationRepository();
    const connectionForInventory = await integrationRepo.getConnectionById(
      listing.connectionId
    );
    if (connectionForInventory?.baseLastInventoryId) {
      inventoryId = connectionForInventory.baseLastInventoryId;
    }
  }

  if (!inventoryId) {
    throw badRequestError(
      'Missing inventoryId for Base.com deletion. Please set an inventory ID in the connection settings or provide one manually.'
    );
  }

  if (!listing.externalListingId) {
    throw badRequestError('Missing Base.com product id for deletion.');
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const runRepository = getPathRunRepository();
  const baseRunMeta: Record<string, unknown> = {
    source: BASE_DELETE_SOURCE,
    sourceInfo: {
      tab: 'products',
      location: 'product-listing',
      action: 'delete_from_base',
      productId,
      listingId,
    },
    executionMode: 'server',
    runMode: 'api',
    integration: 'base.com',
  };
  let runId: string | null = null;
  try {
    const createdRun = await runRepository.createRun({
      userId,
      pathId: BASE_DELETE_RUN_PATH_ID,
      pathName: BASE_DELETE_RUN_PATH_NAME,
      triggerEvent: 'delete_from_base',
      triggerNodeId: `listing:${listingId}`,
      entityId: productId,
      entityType: 'product',
      meta: baseRunMeta,
      maxAttempts: 1,
      retryCount: 0,
    });
    runId = createdRun.id;
    await runRepository.updateRun(runId, {
      status: 'running',
      startedAt: new Date(),
      meta: baseRunMeta,
    });
    await runRepository.createRunEvent({
      runId,
      level: 'info',
      message: 'Delete from Base.com started.',
      metadata: {
        productId,
        listingId,
        externalListingId: listing.externalListingId,
      },
    });
  } catch {
    // Keep deletion flow resilient if runtime-run logging fails.
  }

  const isMissingBaseProduct = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid product identifier') ||
      message.includes('product does not exist')
    );
  };

  try {
    await repo.updateListingStatus(listingId, 'running');
    await repo.appendExportHistory(listingId, {
      exportedAt: new Date(),
      status: 'running',
      inventoryId,
      externalListingId: listing.externalListingId,
    });

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      listing.connectionId
    );
    if (!connection) {
      throw notFoundError('Connection not found', {
        connectionId: listing.connectionId
      });
    }

    let token: string | null = null;
    if (connection.baseApiToken) {
      token = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      token = decryptSecret(connection.password);
    }

    if (!token) {
      throw badRequestError('Base.com API token not found in connection.', {
        connectionId: listing.connectionId
      });
    }

    try {
      await deleteBaseProduct(token, inventoryId, listing.externalListingId);
    } catch (error) {
      if (!isMissingBaseProduct(error)) {
        throw error;
      }
    }

    await repo.updateListingStatus(listingId, 'removed');
    await repo.appendExportHistory(listingId, {
      exportedAt: new Date(),
      status: 'deleted',
      inventoryId,
      externalListingId: listing.externalListingId
    });
    if (runId) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'info',
          message: 'Delete from Base.com completed.',
          metadata: {
            productId,
            listingId,
            inventoryId,
            externalListingId: listing.externalListingId,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'completed',
          finishedAt: new Date(),
          meta: {
            ...baseRunMeta,
            completedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      status: 'deleted',
      message: 'Delete from Base.com finished.',
      runId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete from Base.com.';
    await repo.updateListingStatus(listingId, 'failed').catch(() => undefined);
    await repo
      .appendExportHistory(listingId, {
        exportedAt: new Date(),
        status: 'failed',
        inventoryId,
        externalListingId: listing.externalListingId,
      })
      .catch(() => undefined);
    if (runId) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'error',
          message: `Delete failed: ${errorMessage}`,
          metadata: {
            productId,
            listingId,
            inventoryId,
            externalListingId: listing.externalListingId,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage,
          meta: {
            ...baseRunMeta,
            failedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
    }
    throw error;
  }
}

export const POST = apiHandlerWithParams<{ id: string; listingId: string }>(
  POST_handler,
  { source: 'integrations.products.[id].listings.[listingId].delete-from-base.POST', requireCsrf: false }
);
