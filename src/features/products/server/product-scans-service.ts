import 'server-only';

import {
  isProductScanActiveStatus,
  isProductScanTerminalStatus,
  type ProductScanBatchResponse,
  type ProductScanProvider,
  type ProductScanRecord,
  type ProductScanRequestSequenceEntry,
} from '@/shared/contracts/product-scans';
import {
  getProductScanById,
  listLatestProductScansByProductIds,
  listProductScans,
} from './product-scans-repository';

import {
  synchronize1688ProductScan,
} from './product-scans-sync-1688';

import {
  synchronizeAmazonProductScan,
} from './product-scans-sync-amazon';

import {
  queueAmazonBatchProductScans as queueAmazonBatch,
  queue1688BatchProductScans as queue1688Batch,
} from './product-scans-queuing';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Orchestrates the synchronization of a single product scan by reading its engine run.
 */
export async function synchronizeProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  if (isProductScanTerminalStatus(scan.status)) {
    return scan;
  }

  if (scan.provider === '1688') {
    return await synchronize1688ProductScan(scan);
  }

  try {
    return await synchronizeAmazonProductScan(scan);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.catch',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId: scan.engineRunId,
    });
    return scan;
  }
}

/**
 * Synchronizes multiple product scans in parallel.
 */
export async function synchronizeProductScans(
  scans: ProductScanRecord[]
): Promise<ProductScanRecord[]> {
  if (scans.length === 0) {
    return scans;
  }

  return await Promise.all(
    scans.map(async (scan) =>
      isProductScanActiveStatus(scan.status) ? await synchronizeProductScan(scan) : scan
    )
  );
}

/**
 * Lists product scans and ensures they are synchronized with their engine runs.
 */
export async function listProductScansWithSync(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  provider?: ProductScanProvider | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listProductScans({
      ids: input.ids,
      productId: input.productId,
      productIds: input.productIds,
      provider: input.provider,
      limit: input.limit,
    })
  );
}

/**
 * Lists the latest product scans for multiple products and ensures they are synchronized.
 */
export async function listLatestProductScansByProductIdsWithSync(input: {
  productIds: string[];
}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listLatestProductScansByProductIds({
      productIds: input.productIds,
    })
  );
}

/**
 * Gets a single product scan by ID and ensures it is synchronized.
 */
export async function getProductScanByIdWithSync(
  id: string
): Promise<ProductScanRecord | null> {
  const scan = await getProductScanById(id);
  if (!scan) {
    return null;
  }

  return isProductScanActiveStatus(scan.status) ? await synchronizeProductScan(scan) : scan;
}

/**
 * Queues a batch of Amazon product scans.
 */
export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
  userId?: string | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}): Promise<ProductScanBatchResponse> {
  return await queueAmazonBatch(input);
}

/**
 * Queues a batch of 1688 supplier scans.
 */
export async function queue1688BatchProductScans(input: {
  productIds: string[];
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
  userId?: string | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}): Promise<ProductScanBatchResponse> {
  return await queue1688Batch(input);
}
