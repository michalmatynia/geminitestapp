import type {
  BaseProductSkuCheckPayload,
  BaseProductSkuCheckResponse,
} from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import type { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ExistingSkuDecisionState, QuickExportContext } from './BaseQuickExportButton.types';

type Toast = ReturnType<typeof useToast>['toast'];

export type BaseSkuCheckResolution =
  | { type: 'available' }
  | { type: 'existing'; decision: ExistingSkuDecisionState }
  | { type: 'failed' };

type ResolveBaseSkuCheckInput = {
  product: ProductWithImages;
  context: QuickExportContext;
  toast: Toast;
};

const normalizeNullableString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const fetchBaseSkuCheck = async (
  productId: string,
  context: QuickExportContext
): Promise<BaseProductSkuCheckResponse> =>
  await api.post<BaseProductSkuCheckResponse>(
    `/api/v2/integrations/products/${productId}/base/sku-check`,
    {
      connectionId: context.connectionId,
      inventoryId: context.inventoryId,
    } satisfies BaseProductSkuCheckPayload
  );

const buildExistingSkuDecision = (
  context: QuickExportContext,
  sku: string,
  skuCheck: BaseProductSkuCheckResponse
): ExistingSkuDecisionState => {
  const checkedSku = normalizeNullableString(skuCheck.sku);
  const existingProductId = normalizeNullableString(skuCheck.existingProductId);
  return {
    ...context,
    sku: checkedSku !== '' ? checkedSku : sku,
    existingProductId: existingProductId !== '' ? existingProductId : null,
  };
};

const handleSkuCheckError = (error: unknown, toast: Toast): BaseSkuCheckResolution => {
  logClientError(error);
  const message =
    error instanceof Error ? error.message : 'Failed to verify SKU in Base.com. Export was not started.';
  toast(message, { variant: 'error' });
  return { type: 'failed' };
};

export const resolveBaseSkuCheck = async ({
  product,
  context,
  toast,
}: ResolveBaseSkuCheckInput): Promise<BaseSkuCheckResolution> => {
  const sku = normalizeNullableString(product.sku);
  if (sku === '') return { type: 'available' };

  try {
    const skuCheck = await fetchBaseSkuCheck(product.id, context);
    if (skuCheck.exists !== true) return { type: 'available' };
    return {
      type: 'existing',
      decision: buildExistingSkuDecision(context, sku, skuCheck),
    };
  } catch (error) {
    return handleSkuCheckError(error, toast);
  }
};
