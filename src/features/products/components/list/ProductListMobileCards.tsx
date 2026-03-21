'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useCallback, type ReactNode } from 'react';

import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import {
  useProductListRowActionsContext,
  useProductListRowVisualsContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import { resolveProductAiRunFeedbackForList } from '@/features/products/lib/product-ai-run-feedback';
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
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { ActionMenu, Badge, Button, Checkbox, DropdownMenuItem } from '@/shared/ui';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

import {
  getProductDisplayName,
  getProductListDisplayName,
  getImageFilepath,
  resolveProductCategoryLabel,
} from './columns/product-column-utils';

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

export const ProductListMobileCards = memo(function ProductListMobileCards() {
  const { data, rowSelection, setRowSelection } = useProductListSelectionContext();
  const {
    onProductNameClick,
    onProductEditClick,
    onProductDeleteClick,
    onDuplicateProduct,
    onIntegrationsClick,
    onExportSettingsClick,
    onPrefetchProductDetail,
  } = useProductListRowActionsContext();
  const {
    productNameKey,
    priceGroups,
    currencyCode,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    queuedProductIds,
    productAiRunStatusByProductId,
    categoryNameById,
    thumbnailSource,
    showTriggerRunFeedback,
    imageExternalBaseUrl,
  } = useProductListRowVisualsContext();
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
        const queryKey = productListingsQueryKey(productId);
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn: () => fetchProductListings(productId),
          staleTime: 30 * 1000,
          meta: {
            source: 'products.mobile.integrations.prefetchListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            queryKey,
            tags: ['integrations', 'listings', 'prefetch'],
            description: 'Loads integrations listings.',
          },
        })();
      });
    },
    [queryClient]
  );

  return (
    <ul className='space-y-3'>
      {data.map((product: ProductWithImages) => {
        const nameKey = productNameKey ?? 'name_en';
        const nameValue = getProductListDisplayName(product, nameKey);
        const isSelected = Boolean(rowSelection[product.id]);
        const isImported: boolean = Boolean(product.baseProductId?.trim());
        const productRunFeedback = resolveProductAiRunFeedbackForList({
          productId: product.id,
          queuedProductIds,
          productAiRunStatusByProductId,
        });
        const skuLabel = product.sku?.trim() || 'No SKU';
        const categoryLabel = resolveProductCategoryLabel(product, categoryNameById, nameKey);
        const thumbnailUrl = resolveThumbnailUrl(
          product,
          thumbnailSource,
          imageExternalBaseUrl
        );
        const createdAtLabel = formatDateLabel(product.createdAt);

        const {
          price: displayPrice,
          currencyCode: actualCurrency,
          baseCurrencyCode,
        } = calculatePriceForCurrency(
          product.price,
          product.defaultPriceGroupId,
          currencyCode,
          priceGroups
        );

        const showCurrencyIndicator: boolean = Boolean(
          actualCurrency && actualCurrency !== currencyCode
        );
        const hasConvertedPrice: boolean =
          displayPrice !== null &&
          product.price !== null &&
          Boolean(baseCurrencyCode) &&
          normalizeCurrencyCode(baseCurrencyCode) !== normalizeCurrencyCode(currencyCode) &&
          displayPrice !== product.price;
        const currencyLabel = actualCurrency || currencyCode;
        const formattedPrice =
          displayPrice !== null
            ? `${displayPrice.toFixed(2)}${currencyLabel ? ` ${currencyLabel}` : ''}`
            : '—';

        const showMarketplaceBadge: boolean =
          (integrationBadgeIds?.has(product.id) ?? false) || Boolean(product.baseProductId?.trim());
        const status: string =
          integrationBadgeStatuses?.get(product.id) ??
          (product.baseProductId?.trim() ? 'active' : 'not_started');
        const showTraderaBadge: boolean = traderaBadgeIds?.has(product.id) ?? false;
        const traderaStatus: string = traderaBadgeStatuses?.get(product.id) ?? 'not_started';

        return (
          <li
            key={product.id}
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
                <ProductImageCell
                  imageUrl={thumbnailUrl}
                  productName={getProductDisplayName(product)}
                />
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
                  {(isImported || productRunFeedback) && (
                    <div className='flex flex-wrap items-center gap-2'>
                      {isImported && (
                        <Badge variant='info' icon={<Download className='size-3' />}>
                          Imported
                        </Badge>
                      )}
                      {productRunFeedback ? (
                        <Badge
                          variant={productRunFeedback.variant}
                          className={productRunFeedback.badgeClassName}
                        >
                          {productRunFeedback.label}
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
                    Base: {product.price?.toFixed(2)} {baseCurrencyCode}
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
                onOpenIntegrations={() => onIntegrationsClick(product)}
                onOpenExportSettings={() => onExportSettingsClick(product)}
              />

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

              {showTraderaBadge && (
                <TraderaStatusButton
                  status={traderaStatus}
                  prefetchListings={() => prefetchListings(product.id)}
                  onOpenListings={() => onIntegrationsClick(product)}
                />
              )}
            </div>

            <div className='mt-2 text-[11px] text-muted-foreground'>
              Created {createdAtLabel}
            </div>
          </li>
        );
      })}
    </ul>
  );
});
