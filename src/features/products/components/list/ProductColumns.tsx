'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Download, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { fetchProductListings, productListingsQueryKey } from '@/features/integrations/hooks/useListingQueries';
import { useGenericExportToBaseMutation } from '@/features/integrations/hooks/useProductListingMutations';
import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { EditableCell } from '@/features/products/components/EditableCell';
import { useProductListActionsContext } from '@/features/products/context/ProductListContext';
import { getProductDetailQueryKey, productsListsQueryKey } from '@/features/products/hooks/productCache';
import { useDuplicateProduct } from '@/features/products/hooks/useProductsMutations';
import type { ProductWithImages } from '@/features/products/types';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import { calculatePriceForCurrency, normalizeCurrencyCode } from '@/features/products/utils/priceCalculation';
import { api } from '@/shared/lib/api-client';
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = 'name_en' | 'name_pl' | 'name_de';

const getProductNameValue = (
  product: ProductWithImages,
  key: ProductNameKey
): string | undefined => {
  const value = (product as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const getProductDisplayName = (product: ProductWithImages): string =>
  getProductNameValue(product, 'name_en') ??
  getProductNameValue(product, 'name_pl') ??
  getProductNameValue(product, 'name_de') ??
  'Product';

type CircleIconButtonProps = {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
};

const CircleIconButton = ({
  onClick,
  onMouseEnter,
  onFocus,
  disabled,
  ariaLabel,
  title,
  className,
  children,
}: CircleIconButtonProps): React.JSX.Element => (
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

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const INTEGRATION_SELECTION_GC_TIME_MS = 30 * 60 * 1000;
const defaultExportInventoryQueryKey = ['integrations', 'default-export-inventory'] as const;
const activeExportTemplateQueryKey = ['integrations', 'active-export-template'] as const;
const oneClickExportInFlight = new Set<string>();

const BaseQuickExportButton = ({
  product,
  status,
  prefetchListings,
  showMarketplaceBadge,
  onOpenSettings,
}: {
  product: ProductWithImages;
  status: string;
  prefetchListings: () => void;
  showMarketplaceBadge: boolean;
  onOpenSettings?: (() => void) | undefined;
}): React.JSX.Element => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quickExportMutation = useGenericExportToBaseMutation();
  const quickExportLockRef = useRef(false);
  const [quickExportLocked, setQuickExportLocked] = useState(false);

  const getStatusToneClass = (value: string): string => {
    const normalized = value.toLowerCase();
    if (['active', 'success', 'completed', 'listed', 'ok'].includes(normalized)) {
      return 'border-emerald-400/60 text-emerald-200 hover:border-emerald-300/70 hover:text-emerald-100';
    }
    if (['warning', 'pending', 'queued', 'processing', 'in_progress'].includes(normalized)) {
      return 'border-amber-400/60 text-amber-200 hover:border-amber-300/70 hover:text-amber-100';
    }
    if (['failed', 'error'].includes(normalized)) {
      return 'border-rose-400/60 text-rose-200 hover:border-rose-300/70 hover:text-rose-100';
    }
    return 'border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-gray-200';
  };

  const getBlButtonClass = (value: string, manageMode: boolean): string => {
    if (manageMode) {
      const normalized = value.toLowerCase();
      if (['active', 'success', 'completed', 'listed', 'ok'].includes(normalized)) {
        return 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25';
      }
      if (['warning', 'pending', 'queued', 'processing', 'in_progress'].includes(normalized)) {
        return 'border-amber-400/70 bg-amber-500/15 text-amber-100 hover:border-amber-300/80 hover:bg-amber-500/25';
      }
      if (['failed', 'error', 'removed'].includes(normalized)) {
        return 'border-rose-400/70 bg-rose-500/15 text-rose-100 hover:border-rose-300/80 hover:bg-rose-500/25';
      }
      return 'border-sky-400/70 bg-sky-500/15 text-sky-100 hover:border-sky-300/80 hover:bg-sky-500/25';
    }
    return getStatusToneClass(value);
  };

  const runQuickExport = async (): Promise<void> => {
    if (
      quickExportLockRef.current ||
      quickExportMutation.isPending ||
      oneClickExportInFlight.has(product.id)
    ) {
      return;
    }
    quickExportLockRef.current = true;
    oneClickExportInFlight.add(product.id);
    setQuickExportLocked(true);

    try {
      let connectionId = '';
      let inventoryId = '';
      let templateId = '';
      try {
        const [preferredConnection, defaultInventory, activeTemplate] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: integrationSelectionQueryKeys.defaultConnection,
            queryFn: fetchPreferredBaseConnection,
            staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
            gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
          }),
          queryClient.fetchQuery({
            queryKey: defaultExportInventoryQueryKey,
            queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
            staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
            gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
          }),
          queryClient.fetchQuery({
            queryKey: activeExportTemplateQueryKey,
            queryFn: () => api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template'),
            staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
            gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
          }),
        ]);
        connectionId = preferredConnection?.connectionId?.trim() || '';
        inventoryId = defaultInventory?.inventoryId?.trim() || '';
        templateId = activeTemplate?.templateId?.trim() || '';
      } catch {
        toast('Failed to load Base.com export defaults.', { variant: 'error' });
        return;
      }

      if (!connectionId) {
        toast('Set a default Base.com connection first.', { variant: 'error' });
        return;
      }

      if (!inventoryId) {
        toast('Set a default Base.com inventory first.', { variant: 'error' });
        return;
      }

      const payload: {
        productId: string;
        connectionId: string;
        inventoryId: string;
        templateId?: string;
        requestId?: string;
      } = {
        productId: product.id,
        connectionId,
        inventoryId,
        requestId: `one-click:${product.id}:${connectionId}:${inventoryId}:${Math.floor(Date.now() / 30000)}`,
      };
      if (templateId) {
        payload.templateId = templateId;
      }

      try {
        await quickExportMutation.mutateAsync(payload);
        prefetchListings();
        void queryClient.invalidateQueries({ queryKey: productListingsQueryKey(product.id) });
        toast('Base.com export started.', { variant: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to export to Base.com.';
        toast(message, { variant: 'error' });
      }
    } finally {
      quickExportLockRef.current = false;
      oneClickExportInFlight.delete(product.id);
      setQuickExportLocked(false);
    }
  };

  const label = showMarketplaceBadge
    ? `Manage Base listing (${status}).`
    : 'One-click export to Base.com';
  const quickExportPending = quickExportMutation.isPending || quickExportLocked;

  return (
    <CircleIconButton
      onClick={
        showMarketplaceBadge && onOpenSettings
          ? onOpenSettings
          : (): void => {
            void runQuickExport();
          }
      }
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      disabled={!showMarketplaceBadge && quickExportPending}
      ariaLabel={label}
      title={label}
      className={getBlButtonClass(status, showMarketplaceBadge)}
    >
      <span aria-hidden='true' className='text-[9px] font-black uppercase leading-none tracking-tight'>
        {quickExportPending ? '...' : 'BL'}
      </span>
    </CircleIconButton>
  );
};

interface ColumnActionsProps {
  row: Row<ProductWithImages>;
}

const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
}: ColumnActionsProps) => {
  const product: ProductWithImages = row.original;
  const router = useRouter();
  const { toast } = useToast();
  const { mutateAsync: duplicateProduct } = useDuplicateProduct();
  const {
    onProductEditClick,
    onProductDeleteClick,
    setRefreshTrigger,
  } = useProductListActionsContext();

  const handleDuplicate = async (): Promise<void> => {
    const sku: string | null = window.prompt('Enter a new unique SKU for the duplicate:');
    if (sku === null) return;

    const trimmedSku: string = sku.trim().toUpperCase();
    const skuPattern: RegExp = /^[A-Z0-9]+$/;

    if (!trimmedSku) {
      toast('SKU is required.', { variant: 'error' });
      return;
    }
    if (!skuPattern.test(trimmedSku)) {
      toast('SKU must use uppercase letters and numbers only.', {
        variant: 'error',
      });
      return;
    }

    try {
      const duplicated = await duplicateProduct({ id: product.id, sku: trimmedSku });
      setRefreshTrigger?.((prev: number): number => prev + 1);

      if (duplicated.id) {
        toast('Product duplicated.', { variant: 'success' });
        router.push(`/admin/products/${duplicated.id}/edit`);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to duplicate product.', { variant: 'error' });
    }
  };

  return (
    <div className='flex justify-end'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className='inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-white'
            aria-label='Open row actions'
            type='button'
          >
            <MoreVertical className='size-4' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
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
              void handleDuplicate();
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const getProductColumns = (
  thumbnailSource: 'file' | 'link' | 'base64' = 'file',
  imageExternalBaseUrl: string | null = null
): ColumnDef<ProductWithImages>[] => [
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
      
      const firstFileImage: string | undefined = product.images?.find(
        (img: { imageFile?: { filepath: string } }) => img.imageFile?.filepath
      )?.imageFile?.filepath;

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
      } = useProductListActionsContext();

      const nameKey: ProductNameKey = productNameKey ?? 'name_en';
      const nameValue =
        getProductNameValue(product, nameKey) ??
        getProductNameValue(product, 'name_en') ??
        getProductNameValue(product, 'name_pl') ??
        getProductNameValue(product, 'name_de');

      const isImported: boolean = !!product.baseProductId;
      const isQueued: boolean = queuedProductIds?.has(product.id) ?? false;

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
              if (selection && selection.toString().trim().length > 0) return; // user is selecting for copy
              onProductNameClick(product);
            }}
          >
            {nameValue || '—'}
          </span>

          {product.sku && (
            <div className='flex items-center gap-1.5 text-sm text-gray-500'>
              <span
                className={[
                  'select-text cursor-text',
                ].join(' ')}
              >
                {product.sku}
              </span>
              {isImported && (
                <span title='Imported product'>
                  <Download
                    className='size-3 text-blue-400'
                    aria-label='Imported product'
                  />
                </span>
              )}
              {isQueued && (
                <Badge variant='processing' className='ml-1'>
                  Queued
                </Badge>
              )}
            </div>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: 'price',
    header: ({ column, table }: { column: Column<ProductWithImages, unknown>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const meta: { currencyCode?: string } | undefined = table.options.meta as
        | { currencyCode?: string }
        | undefined;
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
        setRefreshTrigger,
        currencyCode,
        priceGroups,
      } = useProductListActionsContext();
      const queryClient = useQueryClient();

      // Calculate price for the selected currency
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

      // Show currency indicator if different from selected
      const showCurrencyIndicator: boolean = !!(actualCurrency && actualCurrency !== currencyCode);
      const hasConvertedPrice: boolean =
        displayPrice !== null &&
        product.price !== null &&
        !!baseCurrencyCode &&
        normalizeCurrencyCode(baseCurrencyCode) !== normalizeCurrencyCode(currencyCode) &&
        displayPrice !== product.price;

      if (!setRefreshTrigger) {
        return (
          <div className='flex items-center gap-1'>
            <span>{displayPrice !== null ? displayPrice.toFixed(2) : '-'}</span>
            {showCurrencyIndicator && (
              <span className='text-xs text-muted-foreground'>({actualCurrency})</span>
            )}
          </div>
        );
      }

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
              setRefreshTrigger((prev: number): number => prev + 1);
            }}
          />
          {showCurrencyIndicator && displayPrice !== product.price && (
            <span className='text-xs text-muted-foreground' title={`Converted: ${displayPrice?.toFixed(2)} ${actualCurrency}`}>
              →{displayPrice?.toFixed(2)}
            </span>
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
      const { setRefreshTrigger } = useProductListActionsContext();
      const queryClient = useQueryClient();

      if (!setRefreshTrigger) {
        return <div>{product.stock !== null ? product.stock : '-'}</div>;
      }

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
            setRefreshTrigger((prev: number): number => prev + 1);
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
      } = useProductListActionsContext();
      const queryClient = useQueryClient();

      if (!handleClick) return null;
      const showMarketplaceBadge: boolean =
        integrationBadgeIds?.has(product.id) ?? false;
      const status: string = integrationBadgeStatuses?.get(product.id) ?? 'not_started';
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
