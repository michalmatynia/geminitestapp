'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { memo, useCallback } from 'react';
import type { Row } from '@tanstack/react-table';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { isMissingProductListingsError } from '@/features/integrations/product-integrations-adapter';
import {
  useProductListRowActionsContext,
  useProductListRowRuntime,
  useProductListRowVisualsContext,
} from '@/features/products/context/ProductListContext';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import {
  loadProductIntegrationsAdapter,
  type ProductTriggerButtonBarProps,
} from '@/features/products/lib/product-integrations-adapter-loader';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { PRODUCT_LIST_TRIGGER_BUTTON_BAR_CLASSNAME } from '../buttons/ProductListMarketplaceButton';
import { ProductListOpenIntegrationsButton } from '../buttons/ProductListOpenIntegrationsButton';
import { TraderaQuickListButton } from '../buttons/TraderaQuickListButton';

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
  () => import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then((mod) => mod.TriggerButtonBar),
  { ssr: false, loading: () => null }
);

const BaseQuickExportButton = dynamic(() => import('../buttons/BaseQuickExportButton').then((mod) => mod.BaseQuickExportButton), { ssr: false, loading: () => null });
const EcommerceExportButton = dynamic(() => import('../buttons/EcommerceExportButton').then((mod) => mod.EcommerceExportButton), { ssr: false, loading: () => null });
const VintedQuickListButton = dynamic(() => import('../buttons/VintedQuickListButton').then((mod) => mod.VintedQuickListButton), { ssr: false, loading: () => null });
const ScrapedSourceControls = dynamic(() => import('../buttons/ScrapedSourceControls').then((mod) => mod.ScrapedSourceControls), { ssr: false, loading: () => null });
const TraderaStatusButton = dynamic(() => import('../buttons/TraderaStatusButton').then((mod) => mod.TraderaStatusButton), { ssr: false, loading: () => null });
const VintedStatusButton = dynamic(() => import('../buttons/VintedStatusButton').then((mod) => mod.VintedStatusButton), { ssr: false, loading: () => null });
const PlaywrightStatusButton = dynamic(() => import('../buttons/PlaywrightStatusButton').then((mod) => mod.PlaywrightStatusButton), { ssr: false, loading: () => null });

function usePrefetchListings(productId: string, queryClient: QueryClient): () => void {
  return useCallback((): void => {
    loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
      const queryKey = normalizeQueryKey(productListingsQueryKey(productId));
      prefetchQueryV2(queryClient, {
        queryKey,
        queryFn: () => fetchProductListings(productId),
        staleTime: 30 * 1000,
        logError: false,
        meta: { source: 'products.columns.integrations.prefetchListings', operation: 'list', resource: 'integrations.listings', domain: 'integrations', queryKey, tags: ['integrations', 'listings', 'prefetch'], description: 'Loads integrations listings.' },
      })().catch((error: unknown) => {
        if (isMissingProductListingsError(error)) {
          queryClient.removeQueries({ queryKey });
          return;
        }
        logClientCatch(error, { source: 'products.columns.integrations', action: 'prefetchListings', productId, level: 'warn' });
      });
    }).catch((err: unknown) => {
       logClientCatch(err, { source: 'products.columns.integrations', action: 'loadAdapter', productId, level: 'warn' });
    });
  }, [productId, queryClient]);
}

export const IntegrationsCell: React.FC<{ row: Row<ProductWithImages> }> = memo(({ row }) => {
  const product = row.original;
  const actions = useProductListRowActionsContext();
  const visuals = useProductListRowVisualsContext();
  const runtime = useProductListRowRuntime(product.id, product.baseProductId);
  const prefetchListings = usePrefetchListings(product.id, useQueryClient());

  const onIntegrationsClick = actions.onIntegrationsClick;

  return (
    <div className='inline-flex items-center gap-1'>
      <ProductListOpenIntegrationsButton
        onClick={(): void => onIntegrationsClick(product)}
        onMouseEnter={prefetchListings}
        onFocus={prefetchListings}
      />
      <BaseQuickExportButton product={product} status={runtime.integrationStatus} prefetchListings={prefetchListings} showMarketplaceBadge={runtime.showMarketplaceBadge} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'baselinker')} />
      <EcommerceExportButton
        product={product}
        showEcommerceBadge={runtime.showEcommerceBadge}
        ecommerceStatus={runtime.ecommerceStatus}
      />
      <ScrapedSourceControls product={product} showScrapedSourceBadge={runtime.showScrapedSourceBadge} scrapedSourceStatus={runtime.scrapedSourceStatus} prefetchListings={prefetchListings} />
      <TraderaQuickListButton product={product} prefetchListings={prefetchListings} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'tradera')} showTraderaBadge={runtime.showTraderaBadge} traderaStatus={runtime.traderaStatus} />
      {runtime.showTraderaBadge && <TraderaStatusButton productId={product.id} status={runtime.traderaStatus} prefetchListings={prefetchListings} onOpenListings={(rec): void => onIntegrationsClick(product, rec, 'tradera')} customFieldValues={product.customFields} />}
      <VintedQuickListButton product={product} prefetchListings={prefetchListings} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'vinted')} showVintedBadge={runtime.showVintedBadge} vintedStatus={runtime.vintedStatus} />
      {runtime.showVintedBadge && <VintedStatusButton productId={product.id} status={runtime.vintedStatus} prefetchListings={prefetchListings} onOpenListings={(rec): void => onIntegrationsClick(product, rec, 'vinted')} />}
      {visuals.triggerButtonsReady === true && (
        <TriggerButtonBar location='product_row' entityType='product' entityId={product.id} getEntityJson={(): Record<string, unknown> => buildTriggeredProductEntityJson({ product, values: {} })} showRunFeedback={visuals.showTriggerRunFeedback} className={PRODUCT_LIST_TRIGGER_BUTTON_BAR_CLASSNAME} />
      )}
      {runtime.showPlaywrightProgrammableBadge && <PlaywrightStatusButton status={runtime.playwrightProgrammableStatus} prefetchListings={prefetchListings} onOpenListings={(): void => onIntegrationsClick(product, undefined, 'playwright-programmable')} />}
    </div>
  );
});

IntegrationsCell.displayName = 'IntegrationsCell';
