'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo } from 'react';


import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { EditableCell } from '@/features/products/components/EditableCell';
import {
  useProductListRowActionsContext,
  useProductListRowVisualsContext,
} from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/shared/contracts/products';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import {
  calculatePriceForCurrency,
  normalizeCurrencyCode,
} from '@/shared/lib/products/utils/priceCalculation';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { Badge, Button, Checkbox, ActionMenu, DropdownMenuItem, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

import {
  getProductListDisplayName,
  getProductDisplayName,
  getImageFilepath,
  resolveProductCategoryLabel,
} from './columns/product-column-utils';

import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';


const TriggerButtonBar = dynamic(
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

type ProductIntegrationsAdapterModule = typeof import('@/shared/lib/product-integrations-adapter');

let productIntegrationsAdapterPromise: Promise<ProductIntegrationsAdapterModule> | null = null;

const loadProductIntegrationsAdapter = (): Promise<ProductIntegrationsAdapterModule> => {
  if (!productIntegrationsAdapterPromise) {
    productIntegrationsAdapterPromise = import('@/shared/lib/product-integrations-adapter');
  }
  return productIntegrationsAdapterPromise;
};

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

export type Product = ProductWithImages;

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
});

const ImageCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function ImageCell({ row }) {
  const product: ProductWithImages = row.original;
  const { thumbnailSource, imageExternalBaseUrl } = useProductListRowVisualsContext();

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

  return (
    <ProductImageCell imageUrl={imageUrl || null} productName={getProductDisplayName(product)} />
  );
});

const NameCell: React.FC<{ row: Row<ProductWithImages> }> = memo(function NameCell({ row }) {
  const product: ProductWithImages = row.original;
  const { onProductNameClick } = useProductListRowActionsContext();
  const { productNameKey, queuedProductIds, categoryNameById } = useProductListRowVisualsContext();

  const nameKey = productNameKey ?? 'name_en';
  const nameValue = getProductListDisplayName(product, nameKey);

  const isImported: boolean = !!product.baseProductId;
  const isQueued: boolean = queuedProductIds?.has(product.id) ?? false;
  const normalizedSku = (product.sku ?? '').trim();
  const categoryLabel = resolveProductCategoryLabel(
    product,
    categoryNameById,
    productNameKey ?? 'name_en'
  );

  return (
    <div>
      <button
        type='button'
        className={[
          'inline whitespace-normal break-words',
          'select-text',
          'cursor-pointer hover:underline',
          'border-0 bg-transparent p-0 text-left',
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
      </button>

      <div className='flex items-center gap-1.5 text-sm text-gray-500'>
        <span className={['select-text cursor-text'].join(' ')}>{normalizedSku || 'No SKU'}</span>
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
        {isQueued && (
          <Badge variant='processing' className='ml-1'>
            Queued
          </Badge>
        )}
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
  const {
    onIntegrationsClick: handleClick,
  } = useProductListRowActionsContext();
  const {
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
  } = useProductListRowVisualsContext();

  const queryClient = useQueryClient();

  if (!handleClick) return null;
  const showMarketplaceBadge: boolean =
    (integrationBadgeIds?.has(product.id) ?? false) || Boolean(product.baseProductId?.trim());
  const status: string =
    integrationBadgeStatuses?.get(product.id) ??
    (product.baseProductId?.trim() ? 'active' : 'not_started');
  const showTraderaBadge: boolean = traderaBadgeIds?.has(product.id) ?? false;
  const traderaStatus: string = traderaBadgeStatuses?.get(product.id) ?? 'not_started';
  const prefetchListings = (): void => {
    void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
      const queryKey = productListingsQueryKey(product.id);
      void prefetchQueryV2(queryClient, {
        queryKey,
        queryFn: () => fetchProductListings(product.id),
        staleTime: 30 * 1000,
        meta: {
          source: 'products.columns.integrations.prefetchListings',
          operation: 'list',
          resource: 'integrations.listings',
          domain: 'integrations',
          queryKey,
          tags: ['integrations', 'listings', 'prefetch'],
          description: 'Loads integrations listings.',
        },
      })();
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
        onOpenIntegrations={(): void => handleClick(product)}
      />
      <TriggerButtonBar
        location='product_row'
        entityType='product'
        entityId={product.id}
        getEntityJson={(): Record<string, unknown> => product as Record<string, unknown>}
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
      />
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked: boolean | 'indeterminate'): void =>
          row.toggleSelected(!!checked)
        }
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'images',
    header: 'Image',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <ImageCell row={row} />,
  },

  {
    accessorKey: 'name_en',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
        Name
        <ArrowUpDown className='ml-2 size-4' />
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
        <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
          Price{' '}
          <span className='ml-1 text-xs text-muted-foreground' suppressHydrationWarning>
            {currencyCode ? `(${currencyCode})` : ''}
          </span>
          <ArrowUpDown className='ml-2 size-4' />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <PriceCell row={row} />,
  },

  {
    accessorKey: 'stock',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
        Stock
        <ArrowUpDown className='ml-2 size-4' />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => <StockCell row={row} />,
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
    header: () => <span className='sr-only'>Integrations</span>,
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <IntegrationsCell row={row} />
    ),
  },

  {
    id: 'actions',
    header: () => <span className='sr-only'>Actions</span>,
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <ActionsCell row={row} />
    ),
  },
];
