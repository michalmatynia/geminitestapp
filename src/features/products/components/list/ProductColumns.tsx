'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowUpDown, Download, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';

import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { EditableCell } from '@/features/products/components/EditableCell';
import { isMissingProductListingsError } from '@/features/integrations/product-integrations-adapter';
import {
  useProductListHeaderActionsContext,
  useProductListRowActionsContext,
  useProductListRowRuntime,
  useProductListRowVisualsContext,
} from '@/features/products/context/ProductListContext';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import {
  loadProductIntegrationsAdapter,
  type ProductTriggerButtonBarProps,
} from '@/features/products/lib/product-integrations-adapter-loader';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
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
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Tooltip } from '@/shared/ui/tooltip';

import { cn } from '@/shared/utils/ui-utils';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  getProductListDisplayName,
  getProductDisplayName,
  hasImportedProductOrigin,
  getImageFilepath,
  resolveProductCategoryLabel,
} from './columns/product-column-utils';
import { ProductListActivityPill } from './ProductListActivityPill';

import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';

const PRODUCT_TABLE_COLUMN_SIZES = {
  select: 48,
  image: 84,
  price: 140,
  stock: 88,
  createdAt: 200,
  integrations: 220,
  actions: 64,
} as const;

const NOOP_SET_SHOW_TRIGGER_RUN_FEEDBACK = (_nextValue: boolean): void => {};

const FALLBACK_HEADER_ACTIONS_CONTEXT = {
  showTriggerRunFeedback: false,
  setShowTriggerRunFeedback: NOOP_SET_SHOW_TRIGGER_RUN_FEEDBACK,
} as const;

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

const VintedQuickListButton = dynamic(
  () =>
    import('./columns/buttons/VintedQuickListButton').then(
      (mod: typeof import('./columns/buttons/VintedQuickListButton')) => mod.VintedQuickListButton
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

const VintedStatusButton = dynamic(
  () =>
    import('./columns/buttons/VintedStatusButton').then(
      (mod: typeof import('./columns/buttons/VintedStatusButton')) => mod.VintedStatusButton
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

const TraderaLinkModal = dynamic(
  () =>
    import('./TraderaLinkModal').then(
      (mod: typeof import('./TraderaLinkModal')) => mod.TraderaLinkModal
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const CircleIconButton = (props: {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
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
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      {children}
    </Button>
  );
};

interface ColumnActionsProps {
  row: Row<ProductWithImages>;
}

const ActionsCell: React.FC<ColumnActionsProps> = memo(function ActionsCell({
  row,
}: ColumnActionsProps) {
  const product: ProductWithImages = row.original;
  const { onProductEditClick, onProductDeleteClick, onDuplicateProduct, onPrefetchProductDetail } =
    useProductListRowActionsContext();
  const { showTraderaBadge } = useProductListRowRuntime(product.id, product.baseProductId);
  const [traderaLinkOpen, setTraderaLinkOpen] = useState(false);

  return (
    <div className='flex justify-end' onMouseEnter={() => onPrefetchProductDetail(product.id)}>
      <ActionMenu ariaLabel='Open row actions'>
        <DropdownMenuItem
          onSelect={(event: Event): void => {
            event.preventDefault();
            onProductEditClick?.(product);
          }}
        >
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event: Event): void => {
            event.preventDefault();
            onDuplicateProduct?.(product);
          }}
        >
          Duplicate
        </DropdownMenuItem>

        {showTraderaBadge && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event: Event): void => {
                event.preventDefault();
                setTraderaLinkOpen(true);
              }}
            >
              Link Tradera Listing
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onSelect={(event: Event): void => {
            event.preventDefault();
            onProductDeleteClick?.(product);
          }}
        >
          Remove
        </DropdownMenuItem>
      </ActionMenu>
      {traderaLinkOpen && (
        <TraderaLinkModal
          isOpen={traderaLinkOpen}
          product={product}
          onClose={() => setTraderaLinkOpen(false)}
        />
      )}
    </div>
  );
});

const ImageCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function ImageCell({ row }) {
  const product: ProductWithImages = row.original;
  const { thumbnailSource, imageExternalBaseUrl } = useProductListRowVisualsContext();

  const imageUrl = useMemo(() => {
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

    if (thumbnailSource === 'link') {
      return resolvedLinkImage || resolvedFileImage || firstBase64Image;
    }
    if (thumbnailSource === 'base64') {
      return firstBase64Image || resolvedFileImage || resolvedLinkImage;
    }
    return resolvedFileImage || resolvedLinkImage || firstBase64Image;
  }, [product.images, product.imageLinks, product.imageBase64s, thumbnailSource, imageExternalBaseUrl]);

  return (
    <ProductImageCell
      imageUrl={imageUrl || null}
      productName={getProductDisplayName(product)}
      note={product.notes}
    />
  );
});

const NameCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function NameCell({ row }) {
  const product: ProductWithImages = row.original;
  const { onProductNameClick, onPrefetchProductDetail } = useProductListRowActionsContext();
  const { productNameKey, categoryNameById } = useProductListRowVisualsContext();
  const { productAiRunFeedback, productScanRunFeedback } = useProductListRowRuntime(
    product.id,
    product.baseProductId
  );

  const nameKey = productNameKey ?? 'name_en';
  const nameValue = getProductListDisplayName(product, nameKey);

  const isImported = hasImportedProductOrigin(product);
  const normalizedSku = (product.sku ?? '').trim();
  const duplicateSkuCount =
    typeof product.duplicateSkuCount === 'number' && product.duplicateSkuCount > 1
      ? product.duplicateSkuCount
      : null;
  const duplicateSkuTitle = duplicateSkuCount ? `SKU used by ${duplicateSkuCount} products` : null;
  const normalizedProductId = (product.baseProductId ?? product.id ?? '').trim();
  const categoryLabel = resolveProductCategoryLabel(
    product,
    categoryNameById,
    productNameKey ?? 'name_en'
  );
  const autoShippingGroupLabel =
    product.shippingGroupSource === 'category_rule' ? product.shippingGroup?.name?.trim() ?? '' : '';
  const autoShippingRuleLabel = useMemo(() => {
    if (product.shippingGroupSource !== 'category_rule') {
      return '';
    }
    const labels = (product.shippingGroupMatchedCategoryRuleIds ?? [])
      .map((categoryId) => categoryNameById.get(categoryId) ?? categoryId)
      .filter((label) => label.trim().length > 0);
    return labels.join(', ');
  }, [categoryNameById, product.shippingGroupMatchedCategoryRuleIds, product.shippingGroupSource]);
  const autoShippingTooltipLabel = autoShippingRuleLabel
    ? `Auto shipping group: ${autoShippingGroupLabel} via ${autoShippingRuleLabel}`
    : `Auto shipping group: ${autoShippingGroupLabel}`;
  const shippingRuleConflictLabel = useMemo(() => {
    if (product.shippingGroupResolutionReason !== 'multiple_category_rules') {
      return '';
    }
    const labels = product.shippingGroupMatchingGroupNames ?? [];
    return labels.join(', ');
  }, [product.shippingGroupMatchingGroupNames, product.shippingGroupResolutionReason]);
  const shippingRuleConflictTooltip = autoShippingRuleLabel
    ? `Shipping rule conflict: ${shippingRuleConflictLabel} via ${autoShippingRuleLabel}`
    : `Shipping rule conflict: ${shippingRuleConflictLabel}`;
  const missingManualShippingLabel =
    product.shippingGroupResolutionReason === 'manual_missing' &&
    typeof product.shippingGroupId === 'string' &&
    product.shippingGroupId.trim().length > 0
      ? product.shippingGroupId.trim()
      : '';
  const missingManualShippingTooltip = missingManualShippingLabel
    ? `Manual shipping group is missing: ${missingManualShippingLabel}`
    : 'Manual shipping group is missing';

  return (
    <div
      className='min-w-0 cursor-text select-text'
      onMouseEnter={() => onPrefetchProductDetail?.(product.id)}
    >
      <button
        type='button'
        title={nameValue || '—'}
        className={[
          'inline-block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top',
          'select-text',
          'cursor-pointer hover:underline',
          'border-0 bg-transparent p-0 text-left',
          'text-sm font-normal text-white/90',
          'hover:text-white/80',
        ].join(' ')}
        aria-label={`Open ${nameValue || 'product'}`}
        onClick={(): void => {
          const selection = typeof window !== 'undefined' ? window.getSelection() : null;
          if (selection && selection.toString().trim().length > 0) return;
          onProductNameClick(product);
        }}
      >
        {nameValue || '—'}
      </button>

      <div className='mt-1 flex min-w-0 items-center gap-1.5 text-sm text-gray-500'>
        <span
          className={['max-w-[10rem] truncate select-text cursor-text'].join(' ')}
          title={normalizedSku || 'No SKU'}
        >
          {normalizedSku || 'No SKU'}
        </span>
        {duplicateSkuCount ? (
          <span
            className='rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[11px] font-medium text-amber-300'
            title={duplicateSkuTitle ?? undefined}
          >
            Duplicate SKU
          </span>
        ) : null}
        <span aria-hidden='true' className='text-gray-600'>
          |
        </span>
        <span
          className='max-w-[10rem] truncate select-text cursor-text'
          title={normalizedProductId}
        >
          {normalizedProductId}
        </span>
        <span aria-hidden='true' className='text-gray-600'>
          |
        </span>
        <Tooltip content={categoryLabel}>
          <button
            type='button'
            className='max-w-[14rem] truncate rounded-sm border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            aria-label={categoryLabel}
            title={categoryLabel}
          >
            {categoryLabel}
          </button>
        </Tooltip>
        {autoShippingGroupLabel && (
          <>
            <span aria-hidden='true' className='text-gray-600'>
              |
            </span>
            <Tooltip content={autoShippingTooltipLabel}>
              <button
                type='button'
                className='max-w-[12rem] truncate text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1'
                title={autoShippingTooltipLabel}
              >
                Auto ship: {autoShippingGroupLabel}
              </button>
            </Tooltip>
          </>
        )}
        {shippingRuleConflictLabel && (
          <>
            <span aria-hidden='true' className='text-gray-600'>
              |
            </span>
            <Tooltip content={shippingRuleConflictTooltip}>
              <button
                type='button'
                className='max-w-[12rem] truncate text-left text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1'
                title={shippingRuleConflictTooltip}
              >
                Ship conflict
              </button>
            </Tooltip>
          </>
        )}
        {missingManualShippingLabel && (
          <>
            <span aria-hidden='true' className='text-gray-600'>
              |
            </span>
            <Tooltip content={missingManualShippingTooltip}>
              <button
                type='button'
                className='max-w-[12rem] truncate text-left text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1'
                title={missingManualShippingTooltip}
              >
                Ship missing
              </button>
            </Tooltip>
          </>
        )}
        {isImported && (
          <Tooltip
            content={
              getDocumentationTooltip(
                DOCUMENTATION_MODULE_IDS.products,
                'product_imported_badge'
              ) ?? 'Imported product'
            }
          >
            <button
              type='button'
              aria-label='Imported product'
              title='Imported product'
              className='inline-flex rounded-sm border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            >
              <Download className='size-3 text-blue-400' aria-hidden='true' />
            </button>
          </Tooltip>
        )}
        {product.archived ? (
          <Badge variant='removed' icon={<Archive className='size-3' />}>
            Archived
          </Badge>
        ) : null}
        {productAiRunFeedback ? (
          <ProductListActivityPill
            config={{
              kind: 'trigger-button',
              label: productAiRunFeedback.label,
              variant: productAiRunFeedback.variant,
              badgeClassName: productAiRunFeedback.badgeClassName,
            }}
          />
        ) : null}
        {productScanRunFeedback ? (
          <ProductListActivityPill
            config={{
              kind: 'scan',
              label: productScanRunFeedback.label,
              variant: productScanRunFeedback.variant,
              badgeClassName: productScanRunFeedback.badgeClassName,
            }}
          />
        ) : null}
      </div>
    </div>
  );
});

const PriceCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function PriceCell({ row }) {
  const product: ProductWithImages = row.original;
  const { currencyCode, priceGroups } = useProductListRowVisualsContext();

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

  const showCurrencyIndicator: boolean = !!(actualCurrency && actualCurrency !== currencyCode);
  const hasConvertedPrice: boolean =
    displayPrice !== null &&
    product.price !== null &&
    !!baseCurrencyCode &&
    normalizeCurrencyCode(baseCurrencyCode) !== normalizeCurrencyCode(currencyCode) &&
    displayPrice !== product.price;

  if (hasConvertedPrice) {
    return (
      <div className='flex flex-col items-start'>
        <span className='text-foreground'>{displayPrice?.toFixed(2)}</span>
        <span className='text-xs text-muted-foreground'>
          Base: {product.price?.toFixed(2)} {baseCurrencyCode}
        </span>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1'>
      <EditableCell
        value={product.price}
        productId={product.id}
        field='price'
        onUpdate={(): void => {
          // Now handled optimistically by useUpdateProductField mutation
        }}
      />
      {showCurrencyIndicator && displayPrice !== product.price && (
        <Tooltip content={`Converted: ${displayPrice?.toFixed(2)} ${actualCurrency}`}>
          <button
            type='button'
            className='rounded-sm border-0 bg-transparent p-0 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            aria-label={`Converted price: ${displayPrice?.toFixed(2)} ${actualCurrency}`}
            title={`Converted: ${displayPrice?.toFixed(2)} ${actualCurrency}`}
          >
            →{displayPrice?.toFixed(2)}
          </button>
        </Tooltip>
      )}
    </div>
  );
});

const StockCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function StockCell({ row }) {
  const product: ProductWithImages = row.original;

  return (
    <EditableCell
      value={product.stock}
      productId={product.id}
      field='stock'
      onUpdate={(): void => {
        // Now handled optimistically by useUpdateProductField mutation
      }}
    />
  );
});

const IntegrationsCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function IntegrationsCell({
  row,
}) {
  const product: ProductWithImages = row.original;
  const { onIntegrationsClick: handleClick } = useProductListRowActionsContext();
  const { showTriggerRunFeedback, triggerButtonsReady = true } = useProductListRowVisualsContext();
  const {
    showMarketplaceBadge,
    integrationStatus: status,
    showTraderaBadge,
    traderaStatus,
    showVintedBadge,
    vintedStatus,
    showPlaywrightProgrammableBadge,
    playwrightProgrammableStatus,
  } = useProductListRowRuntime(product.id, product.baseProductId);

  const queryClient = useQueryClient();

  if (!handleClick) return null;
  const prefetchListings = (): void => {
    void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
      const queryKey = normalizeQueryKey(productListingsQueryKey(product.id));
      void prefetchQueryV2(queryClient, {
        queryKey,
        queryFn: () => fetchProductListings(product.id),
        staleTime: 30 * 1000,
        logError: false,
        meta: {
          source: 'products.columns.integrations.prefetchListings',
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
          source: 'products.columns.integrations',
          action: 'prefetchListings',
          productId: product.id,
          level: 'warn',
        });
      });
    });
  };
  return (
    <div className='inline-flex items-center gap-1'>
      <CircleIconButton
        onClick={(): void => handleClick(product)}
        onMouseEnter={prefetchListings}
        onFocus={prefetchListings}
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
        prefetchListings={prefetchListings}
        showMarketplaceBadge={showMarketplaceBadge}
        onOpenIntegrations={(recoveryContext): void =>
          handleClick(product, recoveryContext, 'baselinker')
        }
      />
      <TraderaQuickListButton
        product={product}
        prefetchListings={prefetchListings}
        onOpenIntegrations={(recoveryContext): void =>
          handleClick(product, recoveryContext, 'tradera')
        }
        showTraderaBadge={showTraderaBadge}
        traderaStatus={traderaStatus}
      />
      {showTraderaBadge && (
        <TraderaStatusButton
          productId={product.id}
          status={traderaStatus}
          prefetchListings={prefetchListings}
          onOpenListings={(recoveryContext): void =>
            handleClick(product, recoveryContext, 'tradera')
          }
        />
      )}
      <VintedQuickListButton
        product={product}
        prefetchListings={prefetchListings}
        onOpenIntegrations={(recoveryContext): void =>
          handleClick(product, recoveryContext, 'vinted')
        }
        showVintedBadge={showVintedBadge}
        vintedStatus={vintedStatus}
      />
      {showVintedBadge && (
        <VintedStatusButton
          productId={product.id}
          status={vintedStatus}
          prefetchListings={prefetchListings}
          onOpenListings={(recoveryContext): void =>
            handleClick(product, recoveryContext, 'vinted')
          }
        />
      )}
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
      {showPlaywrightProgrammableBadge && (
        <PlaywrightStatusButton
          status={playwrightProgrammableStatus}
          prefetchListings={prefetchListings}
          onOpenListings={(): void => handleClick(product, undefined, 'playwright-programmable')}
        />
      )}
    </div>
  );
});

const TriggerRunFeedbackHeader: React.FC = memo(function TriggerRunFeedbackHeader() {
  let showTriggerRunFeedback: boolean = FALLBACK_HEADER_ACTIONS_CONTEXT.showTriggerRunFeedback;
  let setShowTriggerRunFeedback = FALLBACK_HEADER_ACTIONS_CONTEXT.setShowTriggerRunFeedback;
  let isContextAvailable = true;

  try {
    const context = useProductListHeaderActionsContext();
    showTriggerRunFeedback = context.showTriggerRunFeedback;
    setShowTriggerRunFeedback = context.setShowTriggerRunFeedback;
  } catch {
    isContextAvailable = false;
  }

  return (
    <div className='flex justify-center'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        disabled={!isContextAvailable}
        onClick={() => setShowTriggerRunFeedback(!showTriggerRunFeedback)}
        aria-label={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
        title={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
        className='h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground'
      >
        {showTriggerRunFeedback ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
        <span>{showTriggerRunFeedback ? 'Hide Statuses' : 'Show Statuses'}</span>
      </Button>
    </div>
  );
});

export const getProductColumns = (): ColumnDef<ProductWithImages>[] => [
  {
    id: 'select',
    header: ({ table }: { table: Table<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(checked: boolean | 'indeterminate'): void =>
          table.toggleAllPageRowsSelected(!!checked)
        }
        aria-label='Select all'
        className='cursor-pointer'
      />
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked: boolean | 'indeterminate'): void =>
          row.toggleSelected(!!checked)
        }
        aria-label='Select row'
        className='cursor-pointer'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: PRODUCT_TABLE_COLUMN_SIZES.select,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.select },
  },

  {
    accessorKey: 'images',
    header: 'Image',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <ImageCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.image,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.image },
  },

  {
    accessorKey: 'name_en',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button
        variant='ghost'
        onClick={(): void => column.toggleSorting()}
      >
        Name
        <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <NameCell row={row} />,
  },

  {
    accessorKey: 'price',
    header: ({
      column,
      table,
    }: {
      column: Column<ProductWithImages, unknown>;
      table: Table<ProductWithImages>;
    }): React.JSX.Element => {
      const meta = table.options.meta as { currencyCode?: string } | undefined;
      const currencyCode: string = meta?.currencyCode || '';

      return (
        <Button
          variant='ghost'
          onClick={(): void => column.toggleSorting()}
        >
          Price{' '}
          <span className='ml-1 text-xs text-muted-foreground' suppressHydrationWarning>
            {currencyCode ? `(${currencyCode})` : ''}
          </span>
          <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <PriceCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.price,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.price },
  },

  {
    accessorKey: 'stock',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button
        variant='ghost'
        onClick={(): void => column.toggleSorting()}
      >
        Stock
        <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <StockCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.stock,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.stock },
  },

  {
    accessorKey: 'createdAt',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button
        variant='ghost'
        onClick={(): void => column.toggleSorting()}
      >
        Created At
        <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
      </Button>
    ),
    size: PRODUCT_TABLE_COLUMN_SIZES.createdAt,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.createdAt },
  },

  {
    id: 'integrations',
    header: () => <TriggerRunFeedbackHeader />,
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <IntegrationsCell row={row} />
    ),
    size: PRODUCT_TABLE_COLUMN_SIZES.integrations,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.integrations },
  },

  {
    id: 'actions',
    header: () => <span className='sr-only'>Actions</span>,
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <ActionsCell row={row} />
    ),
    size: PRODUCT_TABLE_COLUMN_SIZES.actions,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.actions },
  },
];
