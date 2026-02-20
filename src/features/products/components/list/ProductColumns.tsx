'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Download } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  TriggerButtonBar,
} from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
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
import type { ProductWithImages } from '@/shared/contracts/products';
import { resolveProductImageUrl } from '@/features/products/utils/image-routing';
import { calculatePriceForCurrency, normalizeCurrencyCode } from '@/features/products/utils/priceCalculation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { api } from '@/shared/lib/api-client';
import { invalidateProductListings } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Badge,
  Button,
  Checkbox,
  ActionMenu,
  DropdownMenuItem,
  useToast,
  Tooltip,
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
  const value = product[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const getProductDisplayName = (product: ProductWithImages): string =>
  getProductNameValue(product, 'name_en') ??
  getProductNameValue(product, 'name_pl') ??
  getProductNameValue(product, 'name_de') ??
  'Product';

const getImageFilepath = (imageFile: unknown): string | undefined => {
  if (!imageFile || typeof imageFile !== 'object') return undefined;
  const filepath = (imageFile as { filepath?: unknown }).filepath;
  return typeof filepath === 'string' && filepath.trim().length > 0 ? filepath : undefined;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;

  const relations = (product as ProductWithImages & { categories?: unknown }).categories;
  if (Array.isArray(relations)) {
    for (const relation of relations) {
      if (!relation || typeof relation !== 'object') continue;
      const record = relation as Record<string, unknown>;
      const relationCategoryId =
        toTrimmedString(record['categoryId']) ||
        toTrimmedString(record['category_id']) ||
        toTrimmedString(record['id']) ||
        toTrimmedString(record['value']);
      if (relationCategoryId) return relationCategoryId;
    }
  } else if (relations && typeof relations === 'object') {
    const record = relations as Record<string, unknown>;
    const relationCategoryId =
      toTrimmedString(record['categoryId']) ||
      toTrimmedString(record['category_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    if (relationCategoryId) return relationCategoryId;
  }

  return '';
};

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
const defaultExportInventoryQueryKey = QUERY_KEYS.integrations.defaultExportInventory();
const oneClickExportInFlight = new Set<string>();

const SUCCESS_STATUSES = new Set(['active', 'success', 'completed', 'listed', 'ok']);
const WARNING_STATUSES = new Set([
  'warning',
  'pending',
  'queued',
  'queued_relist',
  'processing',
  'in_progress',
  'running',
]);
const FAILURE_STATUSES = new Set(['failed', 'error', 'removed', 'needs_login', 'auth_required']);

const normalizeMarketplaceStatus = (value: string): string =>
  value.trim().toLowerCase();

const getStatusToneClass = (value: string): string => {
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/60 text-emerald-200 hover:border-emerald-300/70 hover:text-emerald-100';
  }
  if (WARNING_STATUSES.has(normalized)) {
    return 'border-amber-400/60 text-amber-200 hover:border-amber-300/70 hover:text-amber-100';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/60 text-rose-200 hover:border-rose-300/70 hover:text-rose-100';
  }
  return 'border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-gray-200';
};

const getMarketplaceButtonClass = (
  value: string,
  manageMode: boolean,
  marketplace: 'base' | 'tradera'
): string => {
  if (!manageMode) {
    return getStatusToneClass(value);
  }
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25';
  }
  if (WARNING_STATUSES.has(normalized)) {
    return 'border-amber-400/70 bg-amber-500/15 text-amber-100 hover:border-amber-300/80 hover:bg-amber-500/25';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/70 bg-rose-500/15 text-rose-100 hover:border-rose-300/80 hover:bg-rose-500/25';
  }
  if (marketplace === 'tradera') {
    return 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 hover:border-cyan-300/80 hover:bg-cyan-500/25';
  }
  return 'border-sky-400/70 bg-sky-500/15 text-sky-100 hover:border-sky-300/80 hover:bg-sky-500/25';
};

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
        const [preferredConnection, defaultInventory] = await Promise.all([
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
        ]);
        connectionId = preferredConnection?.connectionId?.trim() || '';
        inventoryId = defaultInventory?.inventoryId?.trim() || '';
        if (!connectionId) {
          toast('Set a default Base.com connection first.', { variant: 'error' });
          return;
        }
        if (!inventoryId) {
          toast(
            'Specific Base.com inventory is not configured. Open Export Settings and set inventory.',
            { variant: 'error' }
          );
          return;
        }

        const inventoriesResponse = await api.post<{
          inventories?: Array<{ inventory_id?: string | number; id?: string | number }>;
        }>('/api/integrations/imports/base', {
          action: 'inventories',
          connectionId,
        });
        const availableInventoryIds = new Set(
          (Array.isArray(inventoriesResponse.inventories)
            ? inventoriesResponse.inventories
            : []
          )
            .map((entry) => {
              const rawId = entry.inventory_id ?? entry.id;
              if (typeof rawId === 'string') return rawId.trim();
              if (typeof rawId === 'number' && Number.isFinite(rawId)) {
                return String(rawId);
              }
              return '';
            })
            .filter((value) => value.length > 0)
        );
        if (
          availableInventoryIds.size > 0 &&
          !availableInventoryIds.has(inventoryId)
        ) {
          toast(
            'Configured Base.com inventory is not available for this connection. Open Export Settings and select a valid inventory.',
            { variant: 'error' }
          );
          return;
        }

        if (connectionId && inventoryId) {
          const scopedTemplate = await api.get<{ templateId?: string | null }>(
            `/api/integrations/exports/base/active-template?connectionId=${encodeURIComponent(connectionId)}&inventoryId=${encodeURIComponent(inventoryId)}`
          );
          templateId = scopedTemplate?.templateId?.trim() || '';
        }
      } catch {
        toast('Failed to load Base.com export defaults.', { variant: 'error' });
        return;
      }

      if (!connectionId) {
        toast('Set a default Base.com connection first.', { variant: 'error' });
        return;
      }

      if (!inventoryId) {
        toast(
          'Specific Base.com inventory is not configured. Open Export Settings and set inventory.',
          { variant: 'error' }
        );
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
        void invalidateProductListings(queryClient, product.id);
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
      className={getMarketplaceButtonClass(status, showMarketplaceBadge, 'base')}
    >
      <span aria-hidden='true' className='text-[9px] font-black uppercase leading-none tracking-tight'>
        {quickExportPending ? '...' : 'BL'}
      </span>
    </CircleIconButton>
  );
};

const TraderaStatusButton = ({
  status,
  prefetchListings,
  onOpenListings,
}: {
  status: string;
  prefetchListings: () => void;
  onOpenListings: () => void;
}): React.JSX.Element => {
  const label = `Manage Tradera listing (${status}).`;

  return (
    <CircleIconButton
      onClick={onOpenListings}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      ariaLabel={label}
      title={label}
      className={getMarketplaceButtonClass(status, true, 'tradera')}
    >
      <span aria-hidden='true' className='text-[10px] font-black uppercase leading-none tracking-tight'>
        T
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

export const getProductColumns = (
  thumbnailSource: 'file' | 'link' | 'base64' = 'file',
  imageExternalBaseUrl: string | null = null,
  categoryNameById: ReadonlyMap<string, string> = new Map<string, string>()
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
      } = useProductListActionsContext();

      const nameKey: ProductNameKey = productNameKey ?? 'name_en';
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
              if (selection && selection.toString().trim().length > 0) return; // user is selecting for copy
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
