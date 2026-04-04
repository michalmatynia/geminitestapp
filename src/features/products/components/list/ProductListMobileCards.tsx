'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useCallback, type ReactNode } from 'react';

import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { isMissingProductListingsError } from '@/features/integrations/hooks/useListingQueries';
import {
  useProductListRowActionsContext,
  useProductListRowRuntime,
  useProductListRowVisualsContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import {
  loadProductIntegrationsAdapter,
  type ProductTriggerButtonBarProps,
} from '@/features/products/lib/product-integrations-adapter-loader';
import type { ProductWithImages } from '@/shared/contracts/products';
import {
  calculatePriceForCurrency,
  normalizeCurrencyCode,
} from '@/shared/lib/products/utils/priceCalculation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';

import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  getProductDisplayName,
  getProductListDisplayName,
  hasImportedProductOrigin,
  getImageFilepath,
  resolveProductCategoryLabel,
} from './columns/product-column-utils';

type ProductListRowActionsContextValue = ReturnType<typeof useProductListRowActionsContext>;
type ProductListRowVisualsContextValue = ReturnType<typeof useProductListRowVisualsContext>;
type ProductListRowRuntimeValue = ReturnType<typeof useProductListRowRuntime>;

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
  () =>
    import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then(
      (
        mod: typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar')
      ) => mod.TriggerButtonBar
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const BaseQuickExportButton = dynamic(
  () =>
    import('./columns/buttons/BaseQuickExportButton').then(
      (mod: typeof import('./columns/buttons/BaseQuickExportButton')) => mod.BaseQuickExportButton
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const TraderaQuickListButton = dynamic(
  () =>
    import('./columns/buttons/TraderaQuickListButton').then(
      (mod: typeof import('./columns/buttons/TraderaQuickListButton')) => mod.TraderaQuickListButton
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const TraderaStatusButton = dynamic(
  () =>
    import('./columns/buttons/TraderaStatusButton').then(
      (mod: typeof import('./columns/buttons/TraderaStatusButton')) => mod.TraderaStatusButton
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const PlaywrightStatusButton = dynamic(
  () =>
    import('./columns/buttons/PlaywrightStatusButton').then(
      (mod: typeof import('./columns/buttons/PlaywrightStatusButton')) => mod.PlaywrightStatusButton
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const resolveThumbnailUrl = (
  product: ProductWithImages,
  thumbnailSource: 'file' | 'link' | 'base64',
  imageExternalBaseUrl: string | null
): string | null => {
  const firstFileImage: string | undefined = product.images
    ?.map((img) => getImageFilepath(img.imageFile))
    .find((filepath): filepath is string => typeof filepath === 'string');

  const firstLinkImage: string | undefined = product.imageLinks?.find(
    (link: string) => link && link.trim().length > 0
  );

  const firstBase64Image: string | undefined = product.imageBase64s?.find(
    (link: string) => link && link.trim().length > 0
  );

  const resolvedFileImage =
    resolveProductImageUrl(firstFileImage, imageExternalBaseUrl) ?? undefined;
  const resolvedLinkImage =
    resolveProductImageUrl(firstLinkImage, imageExternalBaseUrl) ?? undefined;

  let imageUrl: string | undefined;
  if (thumbnailSource === 'link') {
    imageUrl = resolvedLinkImage || resolvedFileImage || firstBase64Image;
  } else if (thumbnailSource === 'base64') {
    imageUrl = firstBase64Image || resolvedFileImage || resolvedLinkImage;
  } else {
    imageUrl = resolvedFileImage || resolvedLinkImage || firstBase64Image;
  }

  return imageUrl ?? null;
};

const formatDateLabel = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const CircleIconButton = (props: {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: ReactNode;
}): React.JSX.Element => {
  const { onClick, onMouseEnter, onFocus, disabled, ariaLabel, title, className, children } = props;

  return (
    <Button
      type='button'
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      variant='ghost'
      size='icon'
      aria-label={ariaLabel}
      title={title}
      className={[
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        disabled ? 'cursor-not-allowed opacity-60' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Button>
  );
};

type ProductListMobileCardResolvedProps = {
  product: ProductWithImages;
  isSelected: boolean;
  toggleSelection: (productId: string, nextChecked: boolean) => void;
  prefetchListings: (productId: string) => void;
  rowActions: ProductListRowActionsContextValue;
  rowVisuals: ProductListRowVisualsContextValue;
  rowRuntime: ProductListRowRuntimeValue;
  nameValue: string;
  isImported: boolean;
  skuLabel: string;
  categoryLabel: string;
  autoShippingGroupLabel: string;
  autoShippingRuleLabel: string;
  shippingRuleConflictLabel: string;
  missingManualShippingLabel: string;
  thumbnailUrl: string | null;
  createdAtLabel: string;
  displayPrice: number | null;
  actualCurrency: string | null;
  baseCurrencyCode: string | null;
  hasConvertedPrice: boolean;
  showCurrencyIndicator: boolean;
  currencyCode: string;
  formattedPrice: string;
};

const renderProductListMobileCard = ({
  product,
  isSelected,
  toggleSelection,
  prefetchListings,
  rowActions,
  rowVisuals,
  rowRuntime,
  nameValue,
  isImported,
  skuLabel,
  categoryLabel,
  autoShippingGroupLabel,
  autoShippingRuleLabel,
  shippingRuleConflictLabel,
  missingManualShippingLabel,
  thumbnailUrl,
  createdAtLabel,
  displayPrice,
  actualCurrency: _actualCurrency,
  baseCurrencyCode,
  hasConvertedPrice,
  showCurrencyIndicator,
  currencyCode,
  formattedPrice,
}: ProductListMobileCardResolvedProps): React.JSX.Element => {
  const {
    onProductNameClick,
    onProductEditClick,
    onProductDeleteClick,
    onDuplicateProduct,
    onIntegrationsClick,
    onExportSettingsClick,
    onPrefetchProductDetail,
  } = rowActions;
  const { showTriggerRunFeedback, triggerButtonsReady = true } = rowVisuals;
  const {
    showMarketplaceBadge,
    integrationStatus: status,
    showTraderaBadge,
    traderaStatus,
    showPlaywrightProgrammableBadge,
    playwrightProgrammableStatus,
    productAiRunFeedback,
  } = rowRuntime;

  return (
    <li
      className='rounded-lg border border-border/60 bg-card/70 p-3 shadow-sm'
      onMouseEnter={() => onPrefetchProductDetail(product.id)}
    >
      <div className='flex items-start gap-3'>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked): void => toggleSelection(product.id, Boolean(checked))}
          aria-label={`Select ${nameValue || 'product'}`}
        />

        <div className='shrink-0'>
          <ProductImageCell imageUrl={thumbnailUrl} productName={getProductDisplayName(product)} />
        </div>

        <div className='min-w-0 flex-1'>
          <button
            type='button'
            className='block w-full text-left text-sm font-semibold text-white/90 hover:text-white hover:underline'
            aria-label={`Open ${nameValue || 'product'}`}
            onClick={(): void => onProductNameClick(product)}
          >
            {nameValue || '—'}
          </button>

          <div className='mt-1 space-y-1 text-xs text-muted-foreground'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='truncate'>SKU: {skuLabel}</span>
              <span aria-hidden='true' className='text-muted-foreground/60'>
                •
              </span>
              <span className='truncate'>Category: {categoryLabel}</span>
            </div>
            {autoShippingGroupLabel && (
              <div className='space-y-0.5'>
                <div className='truncate'>Auto shipping: {autoShippingGroupLabel}</div>
                {autoShippingRuleLabel ? (
                  <div className='truncate'>Auto via: {autoShippingRuleLabel}</div>
                ) : null}
              </div>
            )}
            {shippingRuleConflictLabel ? (
              <div className='space-y-0.5 text-amber-300'>
                <div className='truncate'>Ship conflict</div>
                <div className='truncate'>{shippingRuleConflictLabel}</div>
              </div>
            ) : null}
            {missingManualShippingLabel ? (
              <div className='space-y-0.5 text-amber-300'>
                <div className='truncate'>Ship missing</div>
                <div className='truncate'>{missingManualShippingLabel}</div>
              </div>
            ) : null}
            {(isImported || productAiRunFeedback) && (
              <div className='flex flex-wrap items-center gap-2'>
                {isImported && (
                  <Badge variant='info' icon={<Download className='size-3' />}>
                    Imported
                  </Badge>
                )}
                {productAiRunFeedback ? (
                  <Badge
                    variant={productAiRunFeedback.variant}
                    className={productAiRunFeedback.badgeClassName}
                  >
                    {productAiRunFeedback.label}
                  </Badge>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <ActionMenu ariaLabel='Open product actions'>
          <DropdownMenuItem
            onSelect={(event: Event): void => {
              event.preventDefault();
              onProductEditClick(product);
            }}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event: Event): void => {
              event.preventDefault();
              onDuplicateProduct(product);
            }}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event: Event): void => {
              event.preventDefault();
              onIntegrationsClick(product);
            }}
          >
            Integrations
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event: Event): void => {
              event.preventDefault();
              onExportSettingsClick(product);
            }}
          >
            Export Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onSelect={(event: Event): void => {
              event.preventDefault();
              onProductDeleteClick(product);
            }}
          >
            Remove
          </DropdownMenuItem>
        </ActionMenu>
      </div>

      <div className='mt-3 grid grid-cols-2 gap-3 text-xs'>
        <div className='space-y-0.5'>
          <div className='text-muted-foreground'>Price</div>
          <div className='text-foreground'>{formattedPrice}</div>
          {hasConvertedPrice && (
            <div className='text-[11px] text-muted-foreground'>
              Base: {displayPrice !== null && product.price !== null ? product.price.toFixed(2) : product.price?.toFixed(2)} {baseCurrencyCode}
              {showCurrencyIndicator ? ` (${currencyCode})` : ''}
            </div>
          )}
        </div>
        <div className='space-y-0.5'>
          <div className='text-muted-foreground'>Stock</div>
          <div className='text-foreground'>
            {product.stock !== null && product.stock !== undefined ? product.stock : '—'}
          </div>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <CircleIconButton
          onClick={() => onIntegrationsClick(product)}
          onMouseEnter={() => prefetchListings(product.id)}
          onFocus={() => prefetchListings(product.id)}
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

        <BaseQuickExportButton
          product={product}
          status={status}
          prefetchListings={() => prefetchListings(product.id)}
          showMarketplaceBadge={showMarketplaceBadge}
          onOpenIntegrations={(recoveryContext) =>
            onIntegrationsClick(product, recoveryContext, 'baselinker')
          }
          onOpenExportSettings={() => onExportSettingsClick(product)}
        />
        <TraderaQuickListButton
          product={product}
          prefetchListings={() => prefetchListings(product.id)}
          onOpenIntegrations={(recoveryContext) =>
            onIntegrationsClick(product, recoveryContext, 'tradera')
          }
          showTraderaBadge={showTraderaBadge}
          traderaStatus={traderaStatus}
        />

        {triggerButtonsReady ? (
          <TriggerButtonBar
            location='product_row'
            entityType='product'
            entityId={product.id}
            getEntityJson={(): Record<string, unknown> =>
              buildTriggeredProductEntityJson({
                product,
                values: {},
              })}
            showRunFeedback={showTriggerRunFeedback}
            className='[&_button]:h-8 [&_button]:px-2 [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-tight'
          />
        ) : null}

        {showTraderaBadge && (
          <TraderaStatusButton
            productId={product.id}
            status={traderaStatus}
            prefetchListings={() => prefetchListings(product.id)}
            onOpenListings={(recoveryContext) =>
              onIntegrationsClick(product, recoveryContext, 'tradera')
            }
          />
        )}

        {showPlaywrightProgrammableBadge && (
          <PlaywrightStatusButton
            status={playwrightProgrammableStatus}
            prefetchListings={() => prefetchListings(product.id)}
            onOpenListings={() =>
              onIntegrationsClick(product, undefined, 'playwright-programmable')
            }
          />
        )}
      </div>

      <div className='mt-2 text-[11px] text-muted-foreground'>Created {createdAtLabel}</div>
    </li>
  );
};

const ProductListMobileCard = memo(function ProductListMobileCard({
  product,
  isSelected,
  toggleSelection,
  prefetchListings,
}: {
  product: ProductWithImages;
  isSelected: boolean;
  toggleSelection: (productId: string, nextChecked: boolean) => void;
  prefetchListings: (productId: string) => void;
}) {
  const rowActions = useProductListRowActionsContext();
  const rowVisuals = useProductListRowVisualsContext();
  const rowRuntime = useProductListRowRuntime(product.id, product.baseProductId);

  const nameKey = rowVisuals.productNameKey ?? 'name_en';
  const nameValue = getProductListDisplayName(product, nameKey);
  const isImported = hasImportedProductOrigin(product);
  const skuLabel = product.sku?.trim() || 'No SKU';
  const categoryLabel = resolveProductCategoryLabel(product, rowVisuals.categoryNameById, nameKey);
  const autoShippingGroupLabel =
    product.shippingGroupSource === 'category_rule' ? product.shippingGroup?.name?.trim() ?? '' : '';
  const autoShippingRuleLabel =
    product.shippingGroupSource === 'category_rule'
      ? (product.shippingGroupMatchedCategoryRuleIds ?? [])
          .map((categoryId) => rowVisuals.categoryNameById.get(categoryId) ?? categoryId)
          .filter((label) => label.trim().length > 0)
          .join(', ')
      : '';
  const shippingRuleConflictLabel =
    product.shippingGroupResolutionReason === 'multiple_category_rules'
      ? (product.shippingGroupMatchingGroupNames ?? [])
          .filter((label) => label.trim().length > 0)
          .join(', ')
      : '';
  const missingManualShippingLabel =
    product.shippingGroupResolutionReason === 'manual_missing' &&
    typeof product.shippingGroupId === 'string' &&
    product.shippingGroupId.trim().length > 0
      ? product.shippingGroupId.trim()
      : '';
  const thumbnailUrl = resolveThumbnailUrl(
    product,
    rowVisuals.thumbnailSource,
    rowVisuals.imageExternalBaseUrl
  );
  const createdAtLabel = formatDateLabel(product.createdAt);

  const {
    price: displayPrice,
    currencyCode: actualCurrency,
    baseCurrencyCode,
  } = calculatePriceForCurrency(
    product.price,
    product.defaultPriceGroupId,
    rowVisuals.currencyCode,
    rowVisuals.priceGroups
  );

  const showCurrencyIndicator: boolean = Boolean(
    actualCurrency && actualCurrency !== rowVisuals.currencyCode
  );
  const hasConvertedPrice: boolean =
    displayPrice !== null &&
    product.price !== null &&
    Boolean(baseCurrencyCode) &&
    normalizeCurrencyCode(baseCurrencyCode) !== normalizeCurrencyCode(rowVisuals.currencyCode) &&
    displayPrice !== product.price;
  const currencyLabel = actualCurrency || rowVisuals.currencyCode;
  const formattedPrice =
    displayPrice !== null
      ? `${displayPrice.toFixed(2)}${currencyLabel ? ` ${currencyLabel}` : ''}`
      : '—';

  return renderProductListMobileCard({
    product,
    isSelected,
    toggleSelection,
    prefetchListings,
    rowActions,
    rowVisuals,
    rowRuntime,
    nameValue,
    isImported,
    skuLabel,
    categoryLabel,
    autoShippingGroupLabel,
    autoShippingRuleLabel,
    shippingRuleConflictLabel,
    missingManualShippingLabel,
    thumbnailUrl,
    createdAtLabel,
    displayPrice,
    actualCurrency,
    baseCurrencyCode,
    hasConvertedPrice,
    showCurrencyIndicator,
    currencyCode: rowVisuals.currencyCode,
    formattedPrice,
  });
});

export const ProductListMobileCards = memo(function ProductListMobileCards() {
  const { data, rowSelection, setRowSelection } = useProductListSelectionContext();
  const queryClient = useQueryClient();

  const toggleSelection = useCallback(
    (productId: string, nextChecked: boolean): void => {
      setRowSelection((prev) => {
        const next = { ...prev };
        if (nextChecked) {
          next[productId] = true;
        } else {
          delete next[productId];
        }
        return next;
      });
    },
    [setRowSelection]
  );

  const prefetchListings = useCallback(
    (productId: string): void => {
      void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
        const queryKey = normalizeQueryKey(productListingsQueryKey(productId));
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn: () => fetchProductListings(productId),
          staleTime: 30 * 1000,
          logError: false,
          meta: {
            source: 'products.mobile.integrations.prefetchListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            queryKey,
            tags: ['integrations', 'listings', 'prefetch'],
            description: 'Loads integrations listings.',
          },
        })().catch((error: unknown) => {
          if (isMissingProductListingsError(error)) {
            queryClient.removeQueries({ queryKey });
            return;
          }
          logClientCatch(error, {
            source: 'products.mobile.integrations',
            action: 'prefetchListings',
            productId,
            level: 'warn',
          });
        });
      });
    },
    [queryClient]
  );

  return (
    <ul className='space-y-3'>
      {data.map((product: ProductWithImages) => (
        <ProductListMobileCard
          key={product.id}
          product={product}
          isSelected={Boolean(rowSelection[product.id])}
          toggleSelection={toggleSelection}
          prefetchListings={prefetchListings}
        />
      ))}
    </ul>
  );
});
