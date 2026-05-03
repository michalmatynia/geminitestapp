import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { persistAmazonMatchedAsinOutcome } from '../product-scans-sync-amazon-matched.persistence';

import type { AmazonSyncMatchedContext } from './types';

export const finalizeAmazonScan = async (
  context: AmazonSyncMatchedContext
): Promise<ProductScanRecord> =>
  await persistAmazonMatchedAsinOutcome(context);
