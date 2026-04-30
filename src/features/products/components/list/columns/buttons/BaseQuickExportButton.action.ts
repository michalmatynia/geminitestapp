import { getBaseExportPreflightError } from '@/features/integrations/product-integrations-adapter';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { useToast } from '@/shared/ui/toast';

import { runBaseQuickExportMutation } from './BaseQuickExportButton.mutation';
import { resolveBaseSkuCheck } from './BaseQuickExportButton.sku';
import type { ExistingSkuDecisionState, QuickExportContext } from './BaseQuickExportButton.types';
import type { BaseQuickExportLock } from './useBaseQuickExportLock';
import type { BaseQuickExportTracking } from './useBaseQuickExportTracking';

type Toast = ReturnType<typeof useToast>['toast'];

type BaseQuickExportMutationLike = Parameters<typeof runBaseQuickExportMutation>[0]['quickExportMutation'];

export type RunBaseQuickExportInput = {
  product: ProductWithImages;
  showMarketplaceBadge: boolean;
  quickExportMutation: BaseQuickExportMutationLike;
  lock: BaseQuickExportLock;
  resolveQuickExportContext: () => Promise<QuickExportContext | null>;
  setExistingSkuDecision: (decision: ExistingSkuDecisionState | null) => void;
  tracking: Pick<BaseQuickExportTracking, 'startTrackingExportRun' | 'setTrackedExportStatus'>;
  prefetchListings: () => void;
  toast: Toast;
};

const shouldStartQuickExport = (input: RunBaseQuickExportInput): boolean =>
  input.quickExportMutation.isPending === false && input.lock.acquire();

const showPreflightError = (product: ProductWithImages, toast: Toast): boolean => {
  const preflightError = getBaseExportPreflightError(product.categoryId);
  if (preflightError === null) return false;
  toast(preflightError, { variant: 'error' });
  return true;
};

const resolveExistingSkuDecision = async (
  input: RunBaseQuickExportInput,
  context: QuickExportContext
): Promise<ExistingSkuDecisionState | null | false> => {
  if (input.showMarketplaceBadge) return null;
  const skuCheck = await resolveBaseSkuCheck({
    product: input.product,
    context,
    toast: input.toast,
  });
  if (skuCheck.type === 'failed') return false;
  if (skuCheck.type === 'available') return null;
  return skuCheck.decision;
};

const runQuickExportAfterLock = async (input: RunBaseQuickExportInput): Promise<void> => {
  const context = await input.resolveQuickExportContext();
  if (context === null) return;

  const existingDecision = await resolveExistingSkuDecision(input, context);
  if (existingDecision === false) return;
  if (existingDecision !== null) {
    input.setExistingSkuDecision(existingDecision);
    return;
  }

  await runBaseQuickExportMutation({
    productId: input.product.id,
    context,
    quickExportMutation: input.quickExportMutation,
    startTrackingExportRun: input.tracking.startTrackingExportRun,
    setTrackedExportStatus: input.tracking.setTrackedExportStatus,
    prefetchListings: input.prefetchListings,
    toast: input.toast,
  });
};

export const runBaseQuickExport = async (input: RunBaseQuickExportInput): Promise<void> => {
  if (showPreflightError(input.product, input.toast)) return;
  if (shouldStartQuickExport(input) === false) return;

  try {
    await runQuickExportAfterLock(input);
  } finally {
    input.lock.release();
  }
};
