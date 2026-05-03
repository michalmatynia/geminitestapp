import type {
  BaseProductLinkExistingPayload,
  BaseProductLinkExistingResponse,
} from '@/shared/contracts/integrations/listings';
import { api } from '@/shared/lib/api-client';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import type { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { QueryClient } from '@tanstack/react-query';

import type { ExistingSkuDecisionState } from './BaseQuickExportButton.types';

type Toast = ReturnType<typeof useToast>['toast'];

type LinkExistingBaseProductInput = {
  productId: string;
  queryClient: QueryClient;
  decision: ExistingSkuDecisionState;
  prefetchListings: () => void;
  closeDecisionModal: () => void;
  toast: Toast;
};

const normalizeExternalListingId = (decision: ExistingSkuDecisionState): string =>
  typeof decision.existingProductId === 'string' ? decision.existingProductId.trim() : '';

const linkExistingBaseListing = async (
  productId: string,
  decision: ExistingSkuDecisionState,
  externalListingId: string
): Promise<BaseProductLinkExistingResponse> =>
  await api.post<BaseProductLinkExistingResponse>(
    `/api/v2/integrations/products/${productId}/base/link-existing`,
    {
      connectionId: decision.connectionId,
      inventoryId: decision.inventoryId,
      externalListingId,
    } satisfies BaseProductLinkExistingPayload
  );

export const linkExistingBaseProduct = async ({
  productId,
  queryClient,
  decision,
  prefetchListings,
  closeDecisionModal,
  toast,
}: LinkExistingBaseProductInput): Promise<void> => {
  const externalListingId = normalizeExternalListingId(decision);
  if (externalListingId === '') {
    toast('Existing Base.com product ID is missing. Use "Set up new connection" instead.', {
      variant: 'error',
    });
    return;
  }

  try {
    await linkExistingBaseListing(productId, decision, externalListingId);
    prefetchListings();
    await invalidateProductListingsAndBadges(queryClient, productId);
    closeDecisionModal();
    toast('Linked to existing Base.com product.', { variant: 'success' });
  } catch (error) {
    logClientError(error);
    const message =
      error instanceof Error ? error.message : 'Failed to link product to existing Base.com listing.';
    toast(message, { variant: 'error' });
  }
};
