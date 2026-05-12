'use client';

import { Link2, RefreshCw, ShoppingCart } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ProductScrapedSourceActionResponse } from '@/shared/contracts/products/scraped-source';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getMarketplaceButtonClass } from '../product-column-utils';
import {
  PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS,
  ProductListMarketplaceIconButton,
} from './ProductListMarketplaceButton';

type ScrapedSourceAction = 'link' | 'check-status' | 'run-purchase';

type ScrapedSourceControlsProps = {
  product: ProductWithImages;
  showScrapedSourceBadge: boolean;
  scrapedSourceStatus: string;
  prefetchListings: () => void;
};

const postScrapedSourceAction = (
  action: ScrapedSourceAction,
  productId: string
): Promise<ProductScrapedSourceActionResponse> =>
  api.post<ProductScrapedSourceActionResponse>(`/api/v2/products/scraped-source/${action}`, {
    productId,
  });

const hasSourceUrl = (product: ProductWithImages): boolean =>
  typeof product.supplierLink === 'string' && product.supplierLink.trim().length > 0;

const toastVariantForStatus = (
  status: string
): 'success' | 'warning' =>
  status === 'check_failed' || status === 'unavailable' ? 'warning' : 'success';

const openScrapedSourcePurchaseTarget = (
  response: ProductScrapedSourceActionResponse | null
): void => {
  const targetUrl = response?.actionRunUrl ?? response?.sourceUrl ?? null;
  if (targetUrl !== null) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
};

const useScrapedSourceActions = (
  productId: string
): {
  pendingAction: ScrapedSourceAction | null;
  runAction: (action: ScrapedSourceAction) => Promise<ProductScrapedSourceActionResponse | null>;
} => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<ScrapedSourceAction | null>(null);

  const runAction = useCallback(
    async (action: ScrapedSourceAction): Promise<ProductScrapedSourceActionResponse | null> => {
      setPendingAction(action);
      try {
        const response = await postScrapedSourceAction(action, productId);
        await invalidateProductListingsAndBadges(queryClient, productId);
        toast(response.message, { variant: toastVariantForStatus(response.status) });
        return response;
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Scraped source action failed.', {
          variant: 'error',
        });
        return null;
      } finally {
        setPendingAction(null);
      }
    },
    [productId, queryClient, toast]
  );

  return { pendingAction, runAction };
};

function ScrapedSourceActionButton({
  label,
  status,
  pending,
  onClick,
  onMouseEnter,
  onFocus,
  children,
}: {
  label: string;
  status: string;
  pending: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onFocus: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ProductListMarketplaceIconButton
      type='button'
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      disabled={pending}
      disabledInteractionClass={
        pending && PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS
      }
      toneClass={getMarketplaceButtonClass(status, true, 'scraped')}
      isPending={pending}
      label={label}
    >
      {children}
    </ProductListMarketplaceIconButton>
  );
}

function ScrapedSourceControlsInner({
  product,
  showScrapedSourceBadge,
  scrapedSourceStatus,
  prefetchListings,
}: ScrapedSourceControlsProps): React.JSX.Element | null {
  const { pendingAction, runAction } = useScrapedSourceActions(product.id);

  const handleLink = (): void => {
    void runAction('link');
  };
  const handleStatus = (): void => {
    void runAction('check-status');
  };
  const handlePurchase = (): void => {
    void runAction('run-purchase').then(openScrapedSourcePurchaseTarget);
  };

  const effectiveStatus = showScrapedSourceBadge ? scrapedSourceStatus : 'not_started';

  return (
    <>
      {!showScrapedSourceBadge ? (
        <ScrapedSourceActionButton
          label='Link scraped source'
          status='linked'
          pending={pendingAction === 'link'}
          onClick={handleLink}
          onMouseEnter={prefetchListings}
          onFocus={prefetchListings}
        >
          <Link2 className='size-3.5' aria-hidden='true' />
        </ScrapedSourceActionButton>
      ) : (
        <ScrapedSourceActionButton
          label={`Check scraped source status (${effectiveStatus})`}
          status={effectiveStatus}
          pending={pendingAction === 'check-status'}
          onClick={handleStatus}
          onMouseEnter={prefetchListings}
          onFocus={prefetchListings}
        >
          <RefreshCw className='size-3.5' aria-hidden='true' />
        </ScrapedSourceActionButton>
      )}
      <ScrapedSourceActionButton
        label='Buy scraped item'
        status='purchase_review_required'
        pending={pendingAction === 'run-purchase'}
        onClick={handlePurchase}
        onMouseEnter={prefetchListings}
        onFocus={prefetchListings}
      >
        <ShoppingCart className='size-3.5' aria-hidden='true' />
      </ScrapedSourceActionButton>
    </>
  );
}

export function ScrapedSourceControls(
  props: ScrapedSourceControlsProps
): React.JSX.Element | null {
  if (props.product.importSource !== 'scrape' || !hasSourceUrl(props.product)) return null;
  return <ScrapedSourceControlsInner {...props} />;
}
