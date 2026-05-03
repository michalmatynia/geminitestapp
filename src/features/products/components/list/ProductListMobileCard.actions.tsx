'use client';

import type React from 'react';
import dynamic from 'next/dynamic';

import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductTriggerButtonBarProps } from '@/features/products/lib/product-integrations-adapter-loader';

import { TraderaQuickListButton } from './columns/buttons/TraderaQuickListButton';
import { CircleIconButton } from './ProductListMobileCard.circle-button';
import type { ProductListMobileCardViewProps } from './ProductListMobileCards.types';

type ProductListMobileCardActionsProps = Pick<
  ProductListMobileCardViewProps,
  'product' | 'prefetchListings' | 'rowActions' | 'rowVisuals' | 'rowRuntime'
>;

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
  () =>
    import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then(
      (mod) => mod.TriggerButtonBar
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const BaseQuickExportButton = dynamic(
  () =>
    import('./columns/buttons/BaseQuickExportButton').then((mod) => mod.BaseQuickExportButton),
  {
    ssr: false,
    loading: () => null,
  }
);

const VintedQuickListButton = dynamic(
  () =>
    import('./columns/buttons/VintedQuickListButton').then((mod) => mod.VintedQuickListButton),
  {
    ssr: false,
    loading: () => null,
  }
);

const ScrapedSourceControls = dynamic(
  () =>
    import('./columns/buttons/ScrapedSourceControls').then((mod) => mod.ScrapedSourceControls),
  {
    ssr: false,
    loading: () => null,
  }
);

const TraderaStatusButton = dynamic(
  () =>
    import('./columns/buttons/TraderaStatusButton').then((mod) => mod.TraderaStatusButton),
  {
    ssr: false,
    loading: () => null,
  }
);

const VintedStatusButton = dynamic(
  () =>
    import('./columns/buttons/VintedStatusButton').then((mod) => mod.VintedStatusButton),
  {
    ssr: false,
    loading: () => null,
  }
);

const PlaywrightStatusButton = dynamic(
  () =>
    import('./columns/buttons/PlaywrightStatusButton').then((mod) => mod.PlaywrightStatusButton),
  {
    ssr: false,
    loading: () => null,
  }
);

function OpenIntegrationsButton({
  product,
  prefetchProductListings,
  rowActions,
}: Pick<ProductListMobileCardActionsProps, 'product' | 'rowActions'> & {
  prefetchProductListings: () => void;
}): React.JSX.Element {
  return (
    <CircleIconButton
      onClick={(): void => rowActions.onIntegrationsClick(product)}
      onMouseEnter={prefetchProductListings}
      onFocus={prefetchProductListings}
      ariaLabel='View integrations'
      className='border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-white transition-colors'
    >
      <span
        aria-hidden='true'
        className='inline-flex size-full items-center justify-center text-[20px] font-medium leading-none tracking-tight -translate-y-[1px]'
      >
        +
      </span>
    </CircleIconButton>
  );
}

function BaseAndScrapedSourceActions({
  product,
  prefetchProductListings,
  rowActions,
  rowRuntime,
}: Pick<ProductListMobileCardActionsProps, 'product' | 'rowActions' | 'rowRuntime'> & {
  prefetchProductListings: () => void;
}): React.JSX.Element {
  return (
    <>
      <BaseQuickExportButton
        product={product}
        status={rowRuntime.integrationStatus}
        prefetchListings={prefetchProductListings}
        showMarketplaceBadge={rowRuntime.showMarketplaceBadge}
        onOpenIntegrations={(recoveryContext?: ProductListingsRecoveryContext): void =>
          rowActions.onIntegrationsClick(product, recoveryContext, 'baselinker')
        }
      />
      <ScrapedSourceControls
        product={product}
        showScrapedSourceBadge={rowRuntime.showScrapedSourceBadge}
        scrapedSourceStatus={rowRuntime.scrapedSourceStatus}
        prefetchListings={prefetchProductListings}
      />
    </>
  );
}

function TraderaActions({
  product,
  prefetchProductListings,
  rowActions,
  rowRuntime,
}: Pick<ProductListMobileCardActionsProps, 'product' | 'rowActions' | 'rowRuntime'> & {
  prefetchProductListings: () => void;
}): React.JSX.Element {
  return (
    <>
      <TraderaQuickListButton
        product={product}
        prefetchListings={prefetchProductListings}
        onOpenIntegrations={(recoveryContext?: ProductListingsRecoveryContext): void =>
          rowActions.onIntegrationsClick(product, recoveryContext, 'tradera')
        }
        showTraderaBadge={rowRuntime.showTraderaBadge}
        traderaStatus={rowRuntime.traderaStatus}
      />
      {rowRuntime.showTraderaBadge === true ? (
        <TraderaStatusButton
          productId={product.id}
          status={rowRuntime.traderaStatus}
          prefetchListings={prefetchProductListings}
          onOpenListings={(recoveryContext?: ProductListingsRecoveryContext): void =>
            rowActions.onIntegrationsClick(product, recoveryContext, 'tradera')
          }
          customFieldValues={product.customFields}
        />
      ) : null}
    </>
  );
}

function VintedActions({
  product,
  prefetchProductListings,
  rowActions,
  rowRuntime,
}: Pick<ProductListMobileCardActionsProps, 'product' | 'rowActions' | 'rowRuntime'> & {
  prefetchProductListings: () => void;
}): React.JSX.Element {
  return (
    <>
      <VintedQuickListButton
        product={product}
        prefetchListings={prefetchProductListings}
        onOpenIntegrations={(recoveryContext?: ProductListingsRecoveryContext): void =>
          rowActions.onIntegrationsClick(product, recoveryContext, 'vinted')
        }
        showVintedBadge={rowRuntime.showVintedBadge}
        vintedStatus={rowRuntime.vintedStatus}
      />
      {rowRuntime.showVintedBadge === true ? (
        <VintedStatusButton
          productId={product.id}
          status={rowRuntime.vintedStatus}
          prefetchListings={prefetchProductListings}
          onOpenListings={(recoveryContext?: ProductListingsRecoveryContext): void =>
            rowActions.onIntegrationsClick(product, recoveryContext, 'vinted')
          }
        />
      ) : null}
    </>
  );
}

function TriggerActions({
  product,
  rowVisuals,
}: Pick<
  ProductListMobileCardActionsProps,
  'product' | 'rowVisuals'
>): React.JSX.Element | null {
  if (rowVisuals.triggerButtonsReady !== true) return null;

  return (
    <TriggerButtonBar
      location='product_row'
      entityType='product'
      entityId={product.id}
      getEntityJson={(): Record<string, unknown> =>
        buildTriggeredProductEntityJson({
          product,
          values: {},
        })
      }
      showRunFeedback={rowVisuals.showTriggerRunFeedback}
      className='[&_button]:h-8 [&_button]:px-2 [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-tight'
    />
  );
}

function PlaywrightProgrammableAction({
  product,
  prefetchProductListings,
  rowActions,
  rowRuntime,
}: Pick<ProductListMobileCardActionsProps, 'product' | 'rowActions' | 'rowRuntime'> & {
  prefetchProductListings: () => void;
}): React.JSX.Element | null {
  if (rowRuntime.showPlaywrightProgrammableBadge !== true) return null;

  return (
    <PlaywrightStatusButton
      status={rowRuntime.playwrightProgrammableStatus}
      prefetchListings={prefetchProductListings}
      onOpenListings={(): void =>
        rowActions.onIntegrationsClick(product, undefined, 'playwright-programmable')
      }
    />
  );
}

export function ProductListMobileCardActions({
  product,
  prefetchListings,
  rowActions,
  rowVisuals,
  rowRuntime,
}: ProductListMobileCardActionsProps): React.JSX.Element {
  const prefetchProductListings = (): void => prefetchListings(product.id);

  return (
    <div className='mt-3 flex flex-wrap items-center gap-2'>
      <OpenIntegrationsButton
        product={product}
        prefetchProductListings={prefetchProductListings}
        rowActions={rowActions}
      />
      <BaseAndScrapedSourceActions
        product={product}
        prefetchProductListings={prefetchProductListings}
        rowActions={rowActions}
        rowRuntime={rowRuntime}
      />
      <TraderaActions
        product={product}
        prefetchProductListings={prefetchProductListings}
        rowActions={rowActions}
        rowRuntime={rowRuntime}
      />
      <VintedActions
        product={product}
        prefetchProductListings={prefetchProductListings}
        rowActions={rowActions}
        rowRuntime={rowRuntime}
      />
      <TriggerActions product={product} rowVisuals={rowVisuals} />
      <PlaywrightProgrammableAction
        product={product}
        prefetchProductListings={prefetchProductListings}
        rowActions={rowActions}
        rowRuntime={rowRuntime}
      />
    </div>
  );
}
