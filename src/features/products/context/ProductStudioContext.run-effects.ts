'use client';

import { isProductStudioRunInFlightStatus } from './ProductStudioContext.constants';
import { clearActiveRunCache, readActiveRunCache } from './ProductStudioContext.run-cache';
import type { ProductStudioLoadedState } from './ProductStudioContext.types';

export const PRODUCT_STUDIO_RUN_TIMEOUT_MS = 5 * 60 * 1000;

export type ProductStudioActiveRunInfo = NonNullable<
  NonNullable<ProductStudioLoadedState['variantsState']['variantsData']>['activeRun']
>;

export type RestorableActiveRunInfo = Pick<
  ProductStudioActiveRunInfo,
  'baselineVariantIds' | 'pendingExpectedOutputs' | 'runId' | 'runStatus'
> & {
  dispatchedAt?: string | null;
};

export type ProductStudioRunTarget = {
  productId: string | null;
  selectedImageIndex: number | null;
};

export const countProducedVariantsForRun = (
  activeRun: RestorableActiveRunInfo,
  variants: ProductStudioLoadedState['derivedState']['variants']
): number => {
  const baselineSet = new Set(activeRun.baselineVariantIds);
  return variants.filter((slot) => slot.id.length > 0 && !baselineSet.has(slot.id)).length;
};

const isActiveRunWithinUiTimeout = (activeRun: RestorableActiveRunInfo): boolean => {
  if (activeRun.dispatchedAt === undefined || activeRun.dispatchedAt === null) return true;
  const dispatchedAtMs = Date.parse(activeRun.dispatchedAt);
  if (!Number.isFinite(dispatchedAtMs)) return true;
  return Date.now() - dispatchedAtMs <= PRODUCT_STUDIO_RUN_TIMEOUT_MS;
};

const isRestorableActiveRun = (activeRun: RestorableActiveRunInfo): boolean =>
  isProductStudioRunInFlightStatus(activeRun.runStatus) && isActiveRunWithinUiTimeout(activeRun);

const resolveFailedRunMessage = (activeRun: ProductStudioActiveRunInfo): string => {
  const detail = activeRun.errorMessage?.trim() ?? '';
  return detail.length > 0 ? `Studio generation failed: ${detail}` : 'Studio generation failed.';
};

const resolveCompletedRunMessage = (
  activeRun: ProductStudioActiveRunInfo,
  variants: ProductStudioLoadedState['derivedState']['variants']
): string | null => {
  const expected = Math.max(0, Math.floor(activeRun.pendingExpectedOutputs));
  const produced = countProducedVariantsForRun(activeRun, variants);
  if (expected === 0 || produced >= expected) return null;
  return `Studio generation completed, but only ${produced} of ${expected} generated variants were linked.`;
};

export const resolveTerminalRunErrorMessage = (
  activeRun: ProductStudioActiveRunInfo,
  variants: ProductStudioLoadedState['derivedState']['variants']
): string | null => {
  if (activeRun.runStatus === 'failed') return resolveFailedRunMessage(activeRun);
  if (activeRun.runStatus === 'completed') return resolveCompletedRunMessage(activeRun, variants);
  if (activeRun.runStatus === 'cancelled' || activeRun.runStatus === 'canceled') return 'Studio generation was cancelled.';
  return null;
};

export const clearActiveRunCacheForTarget = ({
  productId,
  selectedImageIndex,
}: ProductStudioRunTarget): void => {
  if (productId === null || selectedImageIndex === null) return;
  clearActiveRunCache(productId, selectedImageIndex);
};

const readActiveRunCacheForTarget = ({
  productId,
  selectedImageIndex,
}: ProductStudioRunTarget): RestorableActiveRunInfo | null => {
  if (productId === null || selectedImageIndex === null) return null;
  return readActiveRunCache(productId, selectedImageIndex);
};

const resolveActiveRunCandidate = (
  variantsData: ProductStudioLoadedState['variantsState']['variantsData'],
  target: ProductStudioRunTarget
): RestorableActiveRunInfo | null => {
  const serverRun = variantsData?.activeRun ?? null;
  return serverRun ?? readActiveRunCacheForTarget(target);
};

export const resolveRestorableActiveRun = ({
  activeRunId,
  target,
  variantsData,
}: {
  activeRunId: string | null;
  target: ProductStudioRunTarget;
  variantsData: ProductStudioLoadedState['variantsState']['variantsData'];
}): RestorableActiveRunInfo | null => {
  if (activeRunId !== null) return null;
  const activeRun = resolveActiveRunCandidate(variantsData, target);
  if (activeRun === null || !isRestorableActiveRun(activeRun)) return null;
  return activeRun;
};
