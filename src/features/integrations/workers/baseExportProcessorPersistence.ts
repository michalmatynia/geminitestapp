import 'server-only';

import { externalServiceError } from '@/shared/errors/app-error';
import type { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { BaseExportJobData } from './baseExportQueue';
import {
  normalizeOptionalId,
  type BaseExportExecution,
  type ListingResolution,
  type ValidatedResources,
  type WarehouseResolution,
} from './baseExportProcessorExecution';

type RunRepository = Awaited<ReturnType<typeof getPathRunRepository>>;

const markListingFailed = async ({
  execution,
  failureReason,
  listing,
  targetInventoryId,
  templateId,
  warehouse,
  requestId,
}: {
  execution: BaseExportExecution;
  failureReason: string;
  listing: ListingResolution;
  targetInventoryId: string;
  templateId: string | null;
  warehouse: WarehouseResolution;
  requestId: string | null;
}): Promise<void> => {
  if (listing.listingId === null) return;

  await listing.listingRepo.updateListing(listing.listingId, {
    status: 'failed',
    failureReason,
  });
  await listing.listingRepo.appendExportHistory(listing.listingId, {
    exportedAt: new Date(),
    status: 'failed',
    inventoryId: targetInventoryId,
    templateId,
    warehouseId: warehouse.warehouseId,
    externalListingId: listing.listingExternalId,
    failureReason,
    fields: execution.exportFields,
    requestId,
  });
};

export const persistFailureAndThrow = async ({
  execution,
  data,
  listing,
  targetInventoryId,
  warehouse,
}: {
  execution: BaseExportExecution;
  data: BaseExportJobData;
  listing: ListingResolution;
  targetInventoryId: string;
  warehouse: WarehouseResolution;
}): Promise<never> => {
  const failureReason = execution.result.error ?? 'Failed to export';

  await markListingFailed({
    execution,
    failureReason,
    listing,
    targetInventoryId,
    templateId: data.templateId,
    warehouse,
    requestId: data.requestId,
  });
  throw externalServiceError(failureReason, { productId: data.productId });
};

const updateProductBaseId = async ({
  productRepo,
  productId,
  currentBaseProductId,
  externalProductId,
}: {
  productRepo: ValidatedResources['productRepo'];
  productId: string;
  currentBaseProductId: string | null;
  externalProductId: string;
}): Promise<void> => {
  if (externalProductId === '') return;
  if (normalizeOptionalId(currentBaseProductId) === externalProductId) return;

  await productRepo.updateProduct(productId, { baseProductId: externalProductId }).catch(
    (error: unknown) => {
      void ErrorSystem.captureException(error);
      return null;
    }
  );
};

const getFinalExternalListingId = (
  externalProductId: string,
  currentListingExternalId: string | null
): string | null => {
  if (externalProductId !== '') return externalProductId;
  return currentListingExternalId;
};

const markListingActive = async ({
  execution,
  listing,
  targetInventoryId,
  templateId,
  warehouse,
  requestId,
  externalProductId,
}: {
  execution: BaseExportExecution;
  listing: ListingResolution;
  targetInventoryId: string;
  templateId: string | null;
  warehouse: WarehouseResolution;
  requestId: string | null;
  externalProductId: string;
}): Promise<void> => {
  if (listing.listingId === null) return;

  const exportedAt = new Date();
  const externalListingId = getFinalExternalListingId(
    externalProductId,
    listing.listingExternalId
  );

  await listing.listingRepo.updateListing(listing.listingId, {
    status: 'active',
    failureReason: null,
    listedAt: exportedAt,
    inventoryId: targetInventoryId,
    externalListingId,
  });
  await listing.listingRepo.appendExportHistory(listing.listingId, {
    exportedAt,
    status: 'active',
    inventoryId: targetInventoryId,
    templateId,
    warehouseId: execution.finalWarehouseId ?? warehouse.warehouseId,
    externalListingId,
    failureReason: null,
    fields: execution.exportFields,
    requestId,
  });
};

export const persistSuccessfulExport = async ({
  execution,
  data,
  resources,
  listing,
  targetInventoryId,
  warehouse,
}: {
  execution: BaseExportExecution;
  data: BaseExportJobData;
  resources: ValidatedResources;
  listing: ListingResolution;
  targetInventoryId: string;
  warehouse: WarehouseResolution;
}): Promise<void> => {
  const externalProductId = normalizeOptionalId(execution.result.productId);

  await updateProductBaseId({
    productRepo: resources.productRepo,
    productId: data.productId,
    currentBaseProductId: resources.product.baseProductId,
    externalProductId,
  });
  await markListingActive({
    execution,
    listing,
    targetInventoryId,
    templateId: data.templateId,
    warehouse,
    requestId: data.requestId,
    externalProductId,
  });
};

export const completeRun = async (runRepository: RunRepository, runId: string): Promise<void> => {
  await runRepository
    .updateRun(runId, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
    })
    .catch(() => undefined);
};
