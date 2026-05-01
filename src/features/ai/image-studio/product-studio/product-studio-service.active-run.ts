import 'server-only';

import { getImageStudioRunById } from '@/features/ai/image-studio/server/run-repository';
import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import type { ProductStudioActiveRunInfo, ProductStudioRunStatus } from '@/shared/contracts/products/studio';
import { getRedisClient } from '@/shared/lib/redis';

const ACTIVE_RUN_TTL_SECONDS = 24 * 60 * 60;

const activeRunKey = (productId: string, imageSlotIndex: number): string =>
  `product-studio:active-run:${productId}:${imageSlotIndex}`;

type ProductStudioActiveRunStoredData = {
  runId: string;
  runKind: 'generation' | 'sequence';
  sequenceRunId: string | null;
  pendingExpectedOutputs: number;
  baselineVariantIds: string[];
  projectId: string;
  dispatchedAt: string;
};

const isTerminalStatus = (status: ProductStudioRunStatus): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

export async function storeProductStudioActiveRun(params: {
  productId: string;
  imageSlotIndex: number;
  data: ProductStudioActiveRunStoredData;
}): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(
      activeRunKey(params.productId, params.imageSlotIndex),
      JSON.stringify(params.data),
      'EX',
      ACTIVE_RUN_TTL_SECONDS
    );
  } catch {
    // Redis failures are non-fatal — generation continues regardless
  }
}

export async function clearProductStudioActiveRun(params: {
  productId: string;
  imageSlotIndex: number;
}): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(activeRunKey(params.productId, params.imageSlotIndex));
  } catch {
    // ignore
  }
}

export async function resolveProductStudioActiveRunInfo(params: {
  productId: string;
  imageSlotIndex: number;
}): Promise<ProductStudioActiveRunInfo | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  let raw: string | null;
  try {
    raw = await redis.get(activeRunKey(params.productId, params.imageSlotIndex));
  } catch {
    return null;
  }
  if (!raw) return null;

  let stored: ProductStudioActiveRunStoredData;
  try {
    stored = JSON.parse(raw) as ProductStudioActiveRunStoredData;
  } catch {
    return null;
  }

  let runStatus: ProductStudioRunStatus;
  try {
    if (stored.runKind === 'sequence') {
      const run = await getImageStudioSequenceRunById(stored.runId);
      runStatus = (run?.status as ProductStudioRunStatus | undefined) ?? 'failed';
    } else {
      const run = await getImageStudioRunById(stored.runId);
      runStatus = (run?.status as ProductStudioRunStatus | undefined) ?? 'failed';
    }
  } catch {
    return null;
  }

  if (isTerminalStatus(runStatus)) {
    await clearProductStudioActiveRun(params);
    return null;
  }

  return {
    runId: stored.runId,
    runKind: stored.runKind,
    sequenceRunId: stored.sequenceRunId,
    pendingExpectedOutputs: stored.pendingExpectedOutputs,
    baselineVariantIds: stored.baselineVariantIds,
    runStatus,
  };
}
