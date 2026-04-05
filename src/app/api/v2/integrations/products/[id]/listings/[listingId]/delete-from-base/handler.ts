import { NextRequest, NextResponse } from 'next/server';

import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { deleteBaseProduct } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import { productListingDeleteFromBasePayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingDeleteFromBaseResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

import { resolveDeleteInventoryId } from './helpers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const BASE_DELETE_RUN_PATH_ID = 'integration-base-delete';
const BASE_DELETE_RUN_PATH_NAME = 'Base.com Deletion Jobs';
const BASE_DELETE_SOURCE = 'integration_base_delete';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
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

  const parsed = await parseJsonBody(_req, productListingDeleteFromBasePayloadSchema, {
    logPrefix: 'integrations.products.listings.DELETE_FROM_BASE',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const inventoryId = resolveDeleteInventoryId(data.inventoryId, listing.inventoryId);
  const normalizedExternalListingId = listing.externalListingId?.trim() || '';

  if (!normalizedExternalListingId) {
    throw badRequestError('Missing Base.com product id for deletion.');
  }

  const session = await readOptionalServerAuthSession();
  const userId = session?.user?.id ?? null;
  const runRepository = await getPathRunRepository();
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
      startedAt: new Date().toISOString(),
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
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // Keep deletion flow resilient if runtime-run logging fails.
  }

  try {
    await repo.updateListingStatus(listingId, 'running');
    await repo.appendExportHistory(listingId, {
      exportedAt: new Date().toISOString(),
      status: 'running',
      inventoryId,
      externalListingId: listing.externalListingId,
    });

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      throw notFoundError('Connection not found', {
        connectionId: listing.connectionId,
      });
    }

    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
    if (!tokenResolution.token) {
      throw badRequestError('Base.com API token not found in connection.', {
        connectionId: listing.connectionId,
      });
    }

    await deleteBaseProduct(tokenResolution.token, inventoryId, normalizedExternalListingId);

    await repo.updateListingExternalId(listingId, null);

    await repo.updateListingStatus(listingId, 'removed');
    await repo.appendExportHistory(listingId, {
      exportedAt: new Date().toISOString(),
      status: 'deleted',
      inventoryId,
      externalListingId: normalizedExternalListingId,
    });
    try {
      const productRepository = await getProductRepository();
      const product = await productRepository.getProductById(productId);
      const normalizedBaseProductId = product?.baseProductId?.trim() || '';
      if (normalizedBaseProductId === normalizedExternalListingId) {
        await productRepository.updateProduct(productId, { baseProductId: null });
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Keep Base deletion successful even if local product cleanup fails.
    }
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
            externalListingId: normalizedExternalListingId,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'completed',
          finishedAt: new Date().toISOString(),
          meta: {
            ...baseRunMeta,
            completedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
    }

    const response: ProductListingDeleteFromBaseResponse = {
      status: 'deleted',
      message: 'Delete from Base.com finished.',
      runId,
    };

    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete from Base.com.';
    await repo.updateListingStatus(listingId, 'failed').catch(() => undefined);
    await repo
      .appendExportHistory(listingId, {
        exportedAt: new Date().toISOString(),
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
          finishedAt: new Date().toISOString(),
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
