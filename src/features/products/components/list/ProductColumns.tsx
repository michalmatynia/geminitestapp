/* eslint-disable */
// @ts-nocheck
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Download } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  TriggerButtonBar,
} from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import {
  fetchProductListings,
} from '@/features/integrations/hooks/useListingQueries';
import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { EditableCell } from '@/features/products/components/EditableCell';
import { useProductListActionsContext } from '@/features/products/context/ProductListContext';
import { getProductDetailQueryKey, productsListsQueryKey } from '@/features/products/hooks/productCache';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import { calculatePriceForCurrency, normalizeCurrencyCode } from '@/features/products/utils/priceCalculation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import type { ProductWithImages } from '@/shared/contracts/products';
import {
  Badge,
  Button,
  Checkbox,
  ActionMenu,
  DropdownMenuItem,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';

import { 
  getProductNameValue, 
  getProductDisplayName, 
  getImageFilepath, 
  resolveProductCategoryId 
} from './columns/product-column-utils';
import { BaseQuickExportButton } from './columns/buttons/BaseQuickExportButton';
import { TraderaStatusButton } from './columns/buttons/TraderaStatusButton';

export type Product = ProductWithImages;

const CircleIconButton = ({
  onClick,
  onMouseEnter,
  onFocus,
  disabled,
  ariaLabel,
  title,
  className,
  children,
}: {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element => (
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

interface ColumnActionsProps {
  row: Row<ProductWithImages>;
}

const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
}: ColumnActionsProps) => {
  const product: ProductWithImages = row.original;
  const {
    onProductEditClick,
    onProductDeleteClick,
    onDuplicateProduct,
  } = useProductListActionsContext();

  return (
    <div className='flex justify-end'>
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
    </div>
  );
};

export const getProductColumns = (): ColumnDef<ProductWithImages>[] => [
  {
    id: 'select',
    header: ({ table }: { table: Table<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(checked: boolean | 'indeterminate'): void => table.toggleAllPageRowsSelected(!!checked)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked: boolean | 'indeterminate'): void => row.toggleSelected(!!checked)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'images',
    header: 'Image',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const { thumbnailSource, imageExternalBaseUrl } = useProductListActionsContext();
      
      const firstFileImage: string | undefined = product.images
        ?.map((img) => getImageFilepath(img.imageFile))
        .find((filepath): filepath is string => typeof filepath === 'string');

      const firstLinkImage: string | undefined = product.imageLinks?.find(
        (link: string) => link && link.trim().length > 0
      );

      const firstBase64Image: string | undefined = product.imageBase64s?.find(
        (link: string) => link && link.trim().length > 0
      );

      const resolvedFileImage = resolveProductImageUrl(firstFileImage, imageExternalBaseUrl) ?? undefined;
      const resolvedLinkImage = resolveProductImageUrl(firstLinkImage, imageExternalBaseUrl) ?? undefined;

      let imageUrl: string | undefined;
      if (thumbnailSource === 'link') {
        imageUrl = resolvedLinkImage || resolvedFileImage || firstBase64Image;
      } else if (thumbnailSource === 'base64') {
        imageUrl = firstBase64Image || resolvedFileImage || resolvedLinkImage;
      } else {
        imageUrl = resolvedFileImage || resolvedLinkImage || firstBase64Image;
      }

      return (
        <ProductImageCell
          imageUrl={imageUrl || null}
          productName={getProductDisplayName(product)}
        />
      );
    },
  },

  {
    accessorKey: 'name_en',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
        Name
        <ArrowUpDown className='ml-2 size-4' />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const {
        productNameKey,
        onProductNameClick,
        queuedProductIds,
        categoryNameById,
      } = useProductListActionsContext();

      const nameKey = productNameKey ?? 'name_en';
      const nameValue =
        getProductNameValue(product, nameKey) ??
        getProductNameValue(product, 'name_en') ??
        getProductNameValue(product, 'name_pl') ??
        getProductNameValue(product, 'name_de');

      const isImported: boolean = !!product.baseProductId;
      const isQueued: boolean = queuedProductIds?.has(product.id) ?? false;
      const normalizedSku = (product.sku ?? '').trim();
      const normalizedCategoryId = resolveProductCategoryId(product);
      const categoryLabel = normalizedCategoryId
        ? (categoryNameById.get(normalizedCategoryId) ?? normalizedCategoryId)
        : 'Unassigned';

      return (
        <div>
          <span
            className={[
              'inline whitespace-normal break-words',
              'select-text',
              'cursor-pointer hover:underline',
              'text-sm font-normal text-white/90',
              'hover:text-white/80',
            ].join(' ')}
            onClick={(): void => {
              const selection = typeof window !== 'undefined' ? window.getSelection() : null;
              if (selection && selection.toString().trim().length > 0) return;
              onProductNameClick(product);
            }}
          >
            {nameValue || '—'}
          </span>

          <div className='flex items-center gap-1.5 text-sm text-gray-500'>
            <span
              className={[
                'select-text cursor-text',
              ].join(' ')}
            >
              {normalizedSku || 'No SKU'}
            </span>
            <span aria-hidden='true' className='text-gray-600'>|</span>
            <Tooltip content={categoryLabel}>
              <span className='max-w-[14rem] truncate'>
                {categoryLabel}
              </span>
            </Tooltip>
            {isImported && (
              <Tooltip
                content={
                  getDocumentationTooltip(
                    DOCUMENTATION_MODULE_IDS.products,
                    'product_imported_badge'
                  ) ?? 'Imported product'
                }
              >
                <span>
                  <Download
                    className='size-3 text-blue-400'
                    aria-label='Imported product'
                  />
                </span>
              </Tooltip>
            )}
            {isQueued && (
              <Badge variant='processing' className='ml-1'>
                Queued
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },

  {
    accessorKey: 'price',
    header: ({ column, table }: { column: Column<ProductWithImages, unknown>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const meta: { currencyCode?: string } | undefined = table.options.meta as any;
      const currencyCode: string = meta?.currencyCode || '';

      return (
        <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
          Price{' '}
          <span className='ml-1 text-xs text-muted-foreground' suppressHydrationWarning>
            {currencyCode ? `(${currencyCode})` : ''}
          </span>
          <ArrowUpDown className='ml-2 size-4' />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const {
        currencyCode,
        priceGroups,
      } = useProductListActionsContext();
      const queryClient = useQueryClient();

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
            <span className='text-foreground'>
              {displayPrice?.toFixed(2)}
            </span>
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
            onUpdate={(nextValue: number): void => {
              queryClient.setQueriesData(
                { queryKey: productsListsQueryKey },
                (old: ProductWithImages[] | undefined) => {
                  if (!Array.isArray(old)) return old;
                  let changed = false;
                  const next = old.map((item: ProductWithImages) => {
                    if (item.id !== product.id) return item;
                    changed = true;
                    return { ...item, price: nextValue };
                  });
                  return changed ? next : old;
                }
              );
              queryClient.setQueriesData(
                { queryKey: getProductDetailQueryKey(product.id) },
                (old: ProductWithImages | undefined) => (old ? { ...old, price: nextValue } : old)
              );
            }}
          />
          {showCurrencyIndicator && displayPrice !== product.price && (
            <Tooltip content={`Converted: ${displayPrice?.toFixed(2)} ${actualCurrency}`}>
              <span className='text-xs text-muted-foreground'>
                →{displayPrice?.toFixed(2)}
              </span>
            </Tooltip>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: 'stock',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
        Stock
        <ArrowUpDown className='ml-2 size-4' />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const queryClient = useQueryClient();

      return (
        <EditableCell
          value={product.stock}
          productId={product.id}
          field='stock'
          onUpdate={(nextValue: number): void => {
            queryClient.setQueriesData(
              { queryKey: productsListsQueryKey },
              (old: ProductWithImages[] | undefined) => {
                if (!Array.isArray(old)) return old;
                let changed = false;
                const next = old.map((item: ProductWithImages) => {
                  if (item.id !== product.id) return item;
                  changed = true;
                  return { ...item, stock: nextValue };
                });
                return changed ? next : old;
              }
            );
            queryClient.setQueriesData(
              { queryKey: getProductDetailQueryKey(product.id) },
              (old: ProductWithImages | undefined) => (old ? { ...old, stock: nextValue } : old)
            );
          }}
        />
      );
    },
  },

  {
    accessorKey: 'createdAt',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
        Created At
        <ArrowUpDown className='ml-2 size-4' />
      </Button>
    ),
  },

  {
    id: 'integrations',
    header: '',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element | null => {
      const product: ProductWithImages = row.original;
      const {
        onIntegrationsClick: handleClick,
        onExportSettingsClick: handleOpenExportSettings,
        integrationBadgeIds,
        integrationBadgeStatuses,
        traderaBadgeIds,
        traderaBadgeStatuses,
      } = useProductListActionsContext();
      const queryClient = useQueryClient();

      if (!handleClick) return null;
      const showMarketplaceBadge: boolean =
        (integrationBadgeIds?.has(product.id) ?? false) ||
        Boolean(product.baseProductId?.trim());
      const status: string =
        integrationBadgeStatuses?.get(product.id) ??
        (product.baseProductId?.trim() ? 'active' : 'not_started');
      const showTraderaBadge: boolean = traderaBadgeIds?.has(product.id) ?? false;
      const traderaStatus: string =
        traderaBadgeStatuses?.get(product.id) ?? 'not_started';
      const prefetchListings = (): void => {
        void queryClient.prefetchQuery({
          queryKey: productListingsQueryKey(product.id),
          queryFn: () => fetchProductListings(product.id),
          staleTime: 30 * 1000,
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
            onOpenSettings={
              handleOpenExportSettings
                ? (): void => handleOpenExportSettings(product)
                : undefined
            }
          />
          <TriggerButtonBar
            location='product_row'
            entityType='product'
            entityId={product.id}
            getEntityJson={(): Record<string, unknown> =>
              product as unknown as Record<string, unknown>
            }
            className='[&_button]:h-8 [&_button]:px-2 [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-tight'
          />
          {showTraderaBadge && (
            <TraderaStatusButton
              status={traderaStatus}
              prefetchListings={prefetchListings}
              onOpenListings={(): void => handleClick(product)}
            />
          )}
        </div>
      );
    },
  },

  {
    id: 'actions',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element | null => {
      return (
        <ActionsCell
          row={row}
        />
      );
    },
  },
];
