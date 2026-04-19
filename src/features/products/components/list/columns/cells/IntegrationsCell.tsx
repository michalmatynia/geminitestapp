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
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
  () => import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then((mod) => mod.TriggerButtonBar),
  { ssr: false, loading: () => null }
);

const BaseQuickExportButton = dynamic(() => import('../buttons/BaseQuickExportButton').then((mod) => mod.BaseQuickExportButton), { ssr: false, loading: () => null });
const TraderaQuickListButton = dynamic(() => import('../buttons/TraderaQuickListButton').then((mod) => mod.TraderaQuickListButton), { ssr: false, loading: () => null });
const VintedQuickListButton = dynamic(() => import('../buttons/VintedQuickListButton').then((mod) => mod.VintedQuickListButton), { ssr: false, loading: () => null });
const TraderaStatusButton = dynamic(() => import('../buttons/TraderaStatusButton').then((mod) => mod.TraderaStatusButton), { ssr: false, loading: () => null });
const VintedStatusButton = dynamic(() => import('../buttons/VintedStatusButton').then((mod) => mod.VintedStatusButton), { ssr: false, loading: () => null });
const PlaywrightStatusButton = dynamic(() => import('../buttons/PlaywrightStatusButton').then((mod) => mod.PlaywrightStatusButton), { ssr: false, loading: () => null });

const CircleIconButton = (props: {
  onClick?: () => void, onMouseEnter?: () => void, onFocus?: () => void, 
  disabled?: boolean, ariaLabel: string, title?: string, className?: string, children: React.ReactNode;
}): React.JSX.Element => (
  <Button type='button' disabled={props.disabled} onClick={props.onClick} onMouseEnter={props.onMouseEnter} onFocus={props.onFocus} variant='ghost' size='icon' aria-label={props.ariaLabel} title={props.title} className={cn('size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent', props.disabled === true && 'cursor-not-allowed opacity-60', props.className)}>
    {props.children}
  </Button>
);

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
      <CircleIconButton onClick={(): void => onIntegrationsClick(product)} onMouseEnter={prefetchListings} onFocus={prefetchListings} ariaLabel='View integrations' className='border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-white transition-colors'>
        <span aria-hidden='true' className='inline-flex size-full items-center justify-center text-[20px] font-medium leading-none tracking-tight -translate-y-[1px]'>+</span>
      </CircleIconButton>
      <BaseQuickExportButton product={product} status={runtime.integrationStatus} prefetchListings={prefetchListings} showMarketplaceBadge={runtime.showMarketplaceBadge} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'baselinker')} />
      <TraderaQuickListButton product={product} prefetchListings={prefetchListings} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'tradera')} showTraderaBadge={runtime.showTraderaBadge} traderaStatus={runtime.traderaStatus} />
      {runtime.showTraderaBadge && <TraderaStatusButton productId={product.id} status={runtime.traderaStatus} prefetchListings={prefetchListings} onOpenListings={(rec): void => onIntegrationsClick(product, rec, 'tradera')} customFieldValues={product.customFields} />}
      <VintedQuickListButton product={product} prefetchListings={prefetchListings} onOpenIntegrations={(rec): void => onIntegrationsClick(product, rec, 'vinted')} showVintedBadge={runtime.showVintedBadge} vintedStatus={runtime.vintedStatus} />
      {runtime.showVintedBadge && <VintedStatusButton productId={product.id} status={runtime.vintedStatus} prefetchListings={prefetchListings} onOpenListings={(rec): void => onIntegrationsClick(product, rec, 'vinted')} />}
      {visuals.triggerButtonsReady === true && (
        <TriggerButtonBar location='product_row' entityType='product' entityId={product.id} getEntityJson={(): Record<string, unknown> => buildTriggeredProductEntityJson({ product, values: {} })} showRunFeedback={visuals.showTriggerRunFeedback} className='[&_button]:h-8 [&_button]:px-2 [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-tight' />
      )}
      {runtime.showPlaywrightProgrammableBadge && <PlaywrightStatusButton status={runtime.playwrightProgrammableStatus} prefetchListings={prefetchListings} onOpenListings={(): void => onIntegrationsClick(product, undefined, 'playwright-programmable')} />}
    </div>
  );
});

IntegrationsCell.displayName = 'IntegrationsCell';
