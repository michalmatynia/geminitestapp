'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Download, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';








import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { EditableCell } from '@/features/products/components/EditableCell';
import { useProductListContext } from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/features/products/types';
import { calculatePriceForCurrency, normalizeCurrencyCode } from '@/features/products/utils/priceCalculation';
import { Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, useToast, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { QueryClient } from '@tanstack/react-query';
import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = 'name_en' | 'name_pl' | 'name_de';

type CircleIconButtonProps = {
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
};

const CircleIconButton = ({
  onClick,
  ariaLabel,
  title,
  className,
  children,
}: CircleIconButtonProps): React.JSX.Element => (
  <Button
    type="button"
    onClick={onClick}
    variant="ghost"
    size="icon"
    aria-label={ariaLabel}
    title={title}
    className={cn(
      'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
      className
    )}
  >
    {children}
  </Button>
);

interface ColumnActionsProps {
  row: Row<ProductWithImages>;
  onProductEditClick?: ((row: ProductWithImages) => void) | undefined;
  onProductDeleteClick?: ((row: ProductWithImages) => void) | undefined;
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>> | undefined;
}

const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
  onProductEditClick,
  onProductDeleteClick,
  setRefreshTrigger,
}: ColumnActionsProps) => {
  const product: ProductWithImages = row.original;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

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

    const res: Response = await fetch(`/api/products/${product.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: trimmedSku }),
    });

    if (res.ok) {
      const duplicated: { id?: string } = (await res.json()) as { id?: string };
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products-count'] });
      setRefreshTrigger?.((prev: number): number => prev + 1);

      if (duplicated.id) {
        toast('Product duplicated.', { variant: 'success' });
        router.push(`/admin/products/${duplicated.id}/edit`);
      }
      return;
    }

    const error: { error?: string } = (await res.json()) as { error?: string };
    toast(error.error || 'Failed to duplicate product.', { variant: 'error' });
  };

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-white"
            aria-label="Open row actions"
            type="button"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
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
            className="text-destructive focus:text-destructive"
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
  thumbnailSource: 'file' | 'link' | 'base64' = 'file'
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
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked: boolean | 'indeterminate'): void => row.toggleSelected(!!checked)}
        aria-label="Select row"
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

      let imageUrl: string | undefined;
      if (thumbnailSource === 'link') {
        imageUrl = firstLinkImage;
      } else if (thumbnailSource === 'base64') {
        imageUrl = firstBase64Image;
      } else {
        imageUrl = firstFileImage;
      }

      return (
        <ProductImageCell
          imageUrl={imageUrl || null}
          productName={product.name_en || product.name_pl || 'Product'}
        />
      );
    },
  },

  {
    accessorKey: 'name_en',
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const {
        productNameKey,
        onProductNameClick,
        queuedProductIds,
      } = useProductListContext();

      const nameKey: ProductNameKey = productNameKey ?? 'name_en';
      const nameValue: string | null | undefined =
        product[nameKey] ??
        product.name_en ??
        product.name_pl ??
        product.name_de;

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
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span
                className={[
                  'select-text cursor-text',
                ].join(' ')}
              >
                {product.sku}
              </span>
              {isImported && (
                <span title="Imported product">
                  <Download
                    className="size-3 text-blue-400"
                    aria-label="Imported product"
                  />
                </span>
              )}
              {isQueued && (
                <Badge variant="processing" className="ml-1">
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
        <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
          Price{' '}
          <span className="ml-1 text-xs text-muted-foreground" suppressHydrationWarning>
            {currencyCode ? `(${currencyCode})` : ''}
          </span>
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const {
        setRefreshTrigger,
        currencyCode,
        priceGroups,
      } = useProductListContext();
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
          <div className="flex items-center gap-1">
            <span>{displayPrice !== null ? displayPrice.toFixed(2) : '-'}</span>
            {showCurrencyIndicator && (
              <span className="text-xs text-muted-foreground">({actualCurrency})</span>
            )}
          </div>
        );
      }

      if (hasConvertedPrice) {
        return (
          <div className="flex flex-col items-start">
            <span className="text-foreground">
              {displayPrice !== null && displayPrice.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              Base: {product.price?.toFixed(2)} {baseCurrencyCode}
            </span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1">
          <EditableCell
            value={product.price}
            productId={product.id}
            field="price"
            onUpdate={(nextValue: number): void => {
              queryClient.setQueriesData(
                { queryKey: ['products'] },
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
                { queryKey: ['products', product.id] },
                (old: ProductWithImages | undefined) => (old ? { ...old, price: nextValue } : old)
              );
              setRefreshTrigger((prev: number): number => prev + 1);
            }}
          />
          {showCurrencyIndicator && displayPrice !== product.price && (
            <span className="text-xs text-muted-foreground" title={`Converted: ${displayPrice?.toFixed(2)} ${actualCurrency}`}>
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
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Stock
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const { setRefreshTrigger } = useProductListContext();
      const queryClient = useQueryClient();

      if (!setRefreshTrigger) {
        return <div>{product.stock !== null ? product.stock : '-'}</div>;
      }

      return (
        <EditableCell
          value={product.stock}
          productId={product.id}
          field="stock"
          onUpdate={(nextValue: number): void => {
            queryClient.setQueriesData(
              { queryKey: ['products'] },
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
              { queryKey: ['products', product.id] },
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
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Created At
        <ArrowUpDown className="ml-2 size-4" />
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
        onExportSettingsClick: handleExportClick,
        integrationBadgeIds,
        integrationBadgeStatuses,
      } = useProductListContext();

      if (!handleClick) return null;
      const showMarketplaceBadge: boolean =
        integrationBadgeIds?.has(product.id) ?? false;
      const status: string = integrationBadgeStatuses?.get(product.id) ?? 'not_started';
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
      const baseIcon = (
        <span aria-hidden="true" className="text-[9px] font-black uppercase leading-none tracking-tight">
          BL
        </span>
      );

      return (
        <div className="inline-flex items-center gap-1">
          <CircleIconButton
            onClick={(): void => handleClick(product)}
            ariaLabel="View integrations"
            className="border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-white transition-colors"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-full items-center justify-center text-[20px] font-medium leading-none tracking-tight -translate-y-[1px]"
            >
              +
            </span>
          </CircleIconButton>
          {showMarketplaceBadge && (
            <CircleIconButton
              onClick={(): void => handleExportClick?.(product)}
              ariaLabel={`Base.com export settings - status: ${status}`}
              title={`Base.com export status: ${status} - Click for export settings`}
              className={getStatusToneClass(status)}
            >
              {baseIcon}
            </CircleIconButton>
          )}
        </div>
      );
    },
  },

  {
    id: 'actions',
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element | null => {
      const {
        onProductEditClick,
        onProductDeleteClick,
        setRefreshTrigger,
      } = useProductListContext();

      return (
        <ActionsCell
          row={row}
          onProductEditClick={onProductEditClick}
          onProductDeleteClick={onProductDeleteClick}
          setRefreshTrigger={setRefreshTrigger}
        />
      );
    },
  },
];
