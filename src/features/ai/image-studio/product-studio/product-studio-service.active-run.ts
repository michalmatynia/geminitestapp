import 'server-only';

import { getImageStudioRunById } from '@/features/ai/image-studio/server/run-repository';
import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import type { ProductStudioActiveRunInfo, ProductStudioRunStatus } from '@/shared/contracts/products/studio';
import { getRedisClient } from '@/shared/lib/redis';

const ACTIVE_RUN_TTL_SECONDS = 24 * 60 * 60;
const ACTIVE_RUN_UI_TIMEOUT_MS = 5 * 60 * 1000;

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
  status === 'completed' ||
  status === 'failed' ||
  status === 'cancelled' ||
  status === 'canceled';

const resolveStoredRunAgeMs = (dispatchedAt: string): number | null => {
  const dispatchedAtMs = Date.parse(dispatchedAt);
  if (!Number.isFinite(dispatchedAtMs)) return null;
  return Date.now() - dispatchedAtMs;
};

const buildActiveRunInfo = (
  stored: ProductStudioActiveRunStoredData,
  runStatus: ProductStudioRunStatus,
  errorMessage: string | null
): ProductStudioActiveRunInfo => ({
  runId: stored.runId,
  runKind: stored.runKind,
  sequenceRunId: stored.sequenceRunId,
  pendingExpectedOutputs: stored.pendingExpectedOutputs,
  baselineVariantIds: stored.baselineVariantIds,
  runStatus,
  dispatchedAt: stored.dispatchedAt,
  errorMessage,
});

type ResolvedActiveRunState = {
  runStatus: ProductStudioRunStatus;
  errorMessage: string | null;
};

const readStoredActiveRunRaw = async (key: string): Promise<string | null> => {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
};

const parseStoredActiveRun = (raw: string): ProductStudioActiveRunStoredData | null => {
  try {
    return JSON.parse(raw) as ProductStudioActiveRunStoredData;
  } catch {
    return null;
  }
};

const resolveSequenceRunState = async (
  runId: string
): Promise<ResolvedActiveRunState> => {
  const run = await getImageStudioSequenceRunById(runId);
  return {
    runStatus: (run?.status as ProductStudioRunStatus | undefined) ?? 'failed',
    errorMessage: run?.errorMessage ?? null,
  };
};

const resolveGenerationRunState = async (
  runId: string
): Promise<ResolvedActiveRunState> => {
  const run = await getImageStudioRunById(runId);
  return {
    runStatus: run?.status ?? 'failed',
    errorMessage: run?.errorMessage ?? null,
  };
};

const resolveStoredRunState = async (
  stored: ProductStudioActiveRunStoredData
): Promise<ResolvedActiveRunState | null> => {
  try {
    return stored.runKind === 'sequence'
      ? await resolveSequenceRunState(stored.runId)
      : await resolveGenerationRunState(stored.runId);
  } catch {
    return null;
  }
};

const isStoredRunStale = (stored: ProductStudioActiveRunStoredData): boolean => {
  const storedAgeMs = resolveStoredRunAgeMs(stored.dispatchedAt);
  return storedAgeMs !== null && storedAgeMs > ACTIVE_RUN_UI_TIMEOUT_MS;
};

const buildTimedOutActiveRunInfo = (
  stored: ProductStudioActiveRunStoredData
): ProductStudioActiveRunInfo =>
  buildActiveRunInfo(
    stored,
    'failed',
    'Studio generation timed out while waiting for generated variants.'
  );

const resolveActiveRunInfoForState = async (
  params: { productId: string; imageSlotIndex: number },
  stored: ProductStudioActiveRunStoredData,
  state: ResolvedActiveRunState
): Promise<ProductStudioActiveRunInfo> => {
  if (isTerminalStatus(state.runStatus)) {
    await clearProductStudioActiveRun(params);
    return buildActiveRunInfo(stored, state.runStatus, state.errorMessage);
  }
  if (isStoredRunStale(stored)) {
    await clearProductStudioActiveRun(params);
    return buildTimedOutActiveRunInfo(stored);
  }
  return buildActiveRunInfo(stored, state.runStatus, state.errorMessage);
};

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
  const raw = await readStoredActiveRunRaw(activeRunKey(params.productId, params.imageSlotIndex));
  if (raw === null) return null;
  const stored = parseStoredActiveRun(raw);
  if (stored === null) return null;
  const state = await resolveStoredRunState(stored);
  if (state === null) return null;
  return await resolveActiveRunInfoForState(params, stored, state);
}
