"use client";

import { Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, useToast } from "@/shared/ui";
import type { PriceGroupForCalculation } from "@/shared/ui";
import type { ColumnDef, Row, Table, Column } from "@tanstack/react-table";
import { ArrowUpDown, Bold, Download, MoreVertical, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";






import { EditableCell } from "@/features/products/components/EditableCell";
import { ProductImageCell } from "@/features/products/components/cells/ProductImageCell";
import type { ProductWithImages } from "@/features/products/types";
import { delay } from "@/shared/utils";

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = "name_en" | "name_pl" | "name_de";

// ✅ Use the real toast function type from your hook (no more variant mismatch)
type ToastFn = ReturnType<typeof useToast>["toast"];

/**
 * Calculates the price for a product in the specified currency.
 * Uses price group relationships to convert between currencies.
 */
function normalizeCurrencyCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

function getGroupCurrencyCode(group: PriceGroupForCalculation): string {
  return normalizeCurrencyCode(
    group.currency?.code ||
      group.currencyCode ||
      (typeof group.currencyId === "string" ? group.currencyId : undefined) ||
      group.groupId
  );
}

function calculatePriceForCurrency(
  basePrice: number | null,
  defaultPriceGroupId: string | null,
  targetCurrencyCode: string,
  priceGroups: PriceGroupForCalculation[]
): { price: number | null; currencyCode: string; baseCurrencyCode: string } {
  if (basePrice === null || !priceGroups.length) {
    return {
      price: null,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizeCurrencyCode(targetCurrencyCode),
    };
  }

  const normalizedTarget: string = normalizeCurrencyCode(targetCurrencyCode);

  const defaultGroup: PriceGroupForCalculation | undefined =
    (defaultPriceGroupId
      ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === defaultPriceGroupId)
      : undefined) ?? priceGroups.find((g: PriceGroupForCalculation): boolean => !!g.isDefault) ?? priceGroups[0];

  if (!defaultGroup) {
    return {
      price: basePrice,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizedTarget,
    };
  }

  const baseCurrencyCode: string = getGroupCurrencyCode(defaultGroup);

  if (baseCurrencyCode && baseCurrencyCode === normalizedTarget) {
    return { price: basePrice, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  const findGroupById = (id?: string | null): PriceGroupForCalculation | undefined =>
    id ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === id || g.groupId === id) : undefined;

  const resolvePriceForGroup = (
    group: PriceGroupForCalculation | undefined,
    visited: Set<string> = new Set<string>()
  ): number | null => {
    if (!group) return null;
    const key: string | undefined = group.id || group.groupId;
    if (key) {
      if (visited.has(key)) return null;
      visited.add(key);
    }

    if (group.id === defaultGroup.id || group.groupId === defaultGroup.groupId) {
      return basePrice;
    }

    if (group.type === "standard") {
      const multiplier: number = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
      const addToPrice: number = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
      return basePrice * multiplier + addToPrice;
    }

    if (group.type === "dependent" && group.sourceGroupId) {
      const source: PriceGroupForCalculation | undefined = findGroupById(group.sourceGroupId);
      const sourcePrice: number | null = resolvePriceForGroup(source, visited);
      if (sourcePrice === null) return null;
      const multiplier: number = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
      const addToPrice: number = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
      return sourcePrice * multiplier + addToPrice;
    }

    return null;
  };

  const targetCandidates: PriceGroupForCalculation[] = priceGroups.filter(
    (group: PriceGroupForCalculation): boolean => {
      const groupCode: string = getGroupCurrencyCode(group);
      const groupIdCode = normalizeCurrencyCode(group.groupId);
      const currencyIdCode =
        typeof group.currencyId === "string" ? normalizeCurrencyCode(group.currencyId) : "";
      return (
        groupCode === normalizedTarget ||
        groupIdCode === normalizedTarget ||
        (currencyIdCode && currencyIdCode === normalizedTarget)
      );
    }
  );

  let resolved: number | null = null;
  for (const candidate of targetCandidates) {
    const candidateResolved = resolvePriceForGroup(candidate);
    if (candidateResolved !== null) {
      resolved = candidateResolved;
      break;
    }
  }
  if (resolved !== null) {
    return { price: resolved, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  return {
    price: basePrice,
    currencyCode: baseCurrencyCode || targetCurrencyCode,
    baseCurrencyCode: baseCurrencyCode || normalizedTarget,
  };
}

interface ColumnActionsProps {
  row: Row<ProductWithImages>;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  onProductEditClick?: ((row: ProductWithImages) => void) | undefined;
}

// Sends a DELETE request to delete a product and triggers refresh on success.
const handleDelete = async (
  id: string,
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>,
  queryClient: QueryClient,
  notify?: ToastFn
): Promise<void> => {
  if (!window.confirm("Are you sure you want to delete this product?")) return;

  const res: Response = await fetch(`/api/products/${id}`, { method: "DELETE" });
  if (res.ok) {
    // Small delay to ensure DB consistency before refetch
    await delay(500);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-count"] }),
    ]);
    setRefreshTrigger((prev: number): number => prev + 1);
    return;
  }

  try {
    console.error("Failed to delete product:", await res.json());
  } catch {
    console.error("Failed to delete product.");
  }

  notify?.("Failed to delete product.", { variant: "error" });
};

const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
  setRefreshTrigger,
  onProductEditClick,
}: ColumnActionsProps) => {
  const product: ProductWithImages = row.original;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const handleDuplicate = async (): Promise<void> => {
    const sku: string | null = window.prompt("Enter a new unique SKU for the duplicate:");
    if (sku === null) return;

    const trimmedSku: string = sku.trim().toUpperCase();
    const skuPattern: RegExp = /^[A-Z0-9]+$/;

    if (!trimmedSku) {
      toast("SKU is required.", { variant: "error" });
      return;
    }
    if (!skuPattern.test(trimmedSku)) {
      toast("SKU must use uppercase letters and numbers only.", {
        variant: "error",
      });
      return;
    }

    const res: Response = await fetch(`/api/products/${product.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: trimmedSku }),
    });

    if (res.ok) {
      const duplicated: { id?: string } = (await res.json()) as { id?: string };
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["products-count"] });
      setRefreshTrigger((prev: number): number => prev + 1);

      if (duplicated.id) {
        toast("Product duplicated.", { variant: "success" });
        router.push(`/admin/products/${duplicated.id}/edit`);
      }
      return;
    }

    const error: { error?: string } = (await res.json()) as { error?: string };
    toast(error.error || "Failed to duplicate product.", { variant: "error" });
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
              void handleDelete(product.id, setRefreshTrigger, queryClient, toast);
            }}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const columns: ColumnDef<ProductWithImages>[] = [
  {
    id: "select",
    header: ({ table }: { table: Table<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(checked: boolean | "indeterminate"): void => table.toggleAllPageRowsSelected(!!checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked: boolean | "indeterminate"): void => row.toggleSelected(!!checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "images",
    header: "Image",
    cell: ({ row }: { row: Row<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      
      const firstFileImage: string | undefined = product.images?.find(
        (img: { imageFile?: { filepath: string } }) => img.imageFile?.filepath
      )?.imageFile?.filepath;

      const firstLinkImage: string | undefined = product.imageLinks?.find(
        (link: string) => link && link.trim().length > 0
      );

      const imageUrl: string | undefined = firstFileImage || firstLinkImage;

      return (
        <ProductImageCell
          imageUrl={imageUrl || null}
          productName={product.name_en || product.name_pl || "Product"}
        />
      );
    },
  },

  {
    accessorKey: "name_en",
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row, table }: { row: Row<ProductWithImages>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;

      const meta: {
            productNameKey?: ProductNameKey;
            onProductNameClick?: (p: ProductWithImages) => void;
          } | undefined = table.options.meta as
        | {
            productNameKey?: ProductNameKey;
            onProductNameClick?: (p: ProductWithImages) => void;
          }
        | undefined;

      const nameKey: ProductNameKey = meta?.productNameKey ?? "name_en";
      const nameValue: string | null | undefined =
        product[nameKey] ??
        product.name_en ??
        product.name_pl ??
        product.name_de;

      const handleNameClick: ((p: ProductWithImages) => void) | undefined = meta?.onProductNameClick;

      const isImported: boolean = !!product.baseProductId;

      return (
        <div>
          {handleNameClick ? (
            <Button
              variant="ghost"
              className="h-auto w-full cursor-pointer justify-start p-0 text-left text-sm font-normal text-white/90 transition-colors hover:bg-transparent hover:text-white/70 whitespace-normal break-words"
              onClick={(): void => handleNameClick(product)}
              type="button"
            >
              {nameValue || "—"}
            </Button>
          ) : (
            <span>{nameValue || "—"}</span>
          )}

          {product.sku && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>{product.sku}</span>
              {isImported && (
                <span title="Imported product">
                  <Download
                    className="size-3 text-blue-400"
                    aria-label="Imported product"
                  />
                </span>
              )}
            </div>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: "price",
    header: ({ column, table }: { column: Column<ProductWithImages, unknown>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const meta: { currencyCode?: string } | undefined = table.options.meta as
        | { currencyCode?: string }
        | undefined;
      const currencyCode: string = meta?.currencyCode || "";

      return (
        <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
          Price {currencyCode && <span className="ml-1 text-xs text-muted-foreground">({currencyCode})</span>}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row, table }: { row: Row<ProductWithImages>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const meta: {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            currencyCode?: string;
            priceGroups?: PriceGroupForCalculation[];
            queryClient?: QueryClient;
          } | undefined = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            currencyCode?: string;
            priceGroups?: PriceGroupForCalculation[];
            queryClient?: QueryClient;
          }
        | undefined;

      const setRefreshTrigger: React.Dispatch<React.SetStateAction<number>> | undefined = meta?.setRefreshTrigger;
      const currencyCode: string = meta?.currencyCode || "";
      const priceGroups: PriceGroupForCalculation[] = meta?.priceGroups || [];

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
            <span>{displayPrice !== null ? displayPrice.toFixed(2) : "-"}</span>
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
            onUpdate={(): void => {
              if (meta?.queryClient) {
                void meta.queryClient.invalidateQueries({ queryKey: ["products"] });
                void meta.queryClient.invalidateQueries({ queryKey: ["products-count"] });
              }
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
    accessorKey: "stock",
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Stock
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row, table }: { row: Row<ProductWithImages>; table: Table<ProductWithImages> }): React.JSX.Element => {
      const product: ProductWithImages = row.original;
      const meta: {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            queryClient?: QueryClient;
          } | undefined = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            queryClient?: QueryClient;
          }
        | undefined;

      const setRefreshTrigger: React.Dispatch<React.SetStateAction<number>> | undefined = meta?.setRefreshTrigger;
      if (!setRefreshTrigger) {
        return <div>{product.stock !== null ? product.stock : "-"}</div>;
      }

      return (
        <EditableCell
          value={product.stock}
          productId={product.id}
          field="stock"
          onUpdate={(): void => {
            if (meta?.queryClient) {
              void meta.queryClient.invalidateQueries({ queryKey: ["products"] });
              void meta.queryClient.invalidateQueries({ queryKey: ["products-count"] });
            }
            setRefreshTrigger((prev: number): number => prev + 1);
          }}
        />
      );
    },
  },

  {
    accessorKey: "createdAt",
    header: ({ column }: { column: Column<ProductWithImages, unknown> }): React.JSX.Element => (
      <Button variant="ghost" onClick={(): void => column.toggleSorting()}>
        Created At
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
  },

  {
    id: "integrations",
    header: "",
    cell: ({ row, table }: { row: Row<ProductWithImages>; table: Table<ProductWithImages> }): React.JSX.Element | null => {
      const product: ProductWithImages = row.original;
      const meta: {
            onIntegrationsClick?: (p: ProductWithImages) => void;
            onExportSettingsClick?: (p: ProductWithImages) => void;
            integrationBadgeIds?: Set<string>;
            integrationBadgeStatuses?: Map<string, string>;
            queryClient?: QueryClient;
          } | undefined = table.options.meta as
        | {
            onIntegrationsClick?: (p: ProductWithImages) => void;
            onExportSettingsClick?: (p: ProductWithImages) => void;
            integrationBadgeIds?: Set<string>;
            integrationBadgeStatuses?: Map<string, string>;
            queryClient?: QueryClient;
          }
        | undefined;

      const handleClick: ((p: ProductWithImages) => void) | undefined = meta?.onIntegrationsClick;
      const handleExportClick: ((p: ProductWithImages) => void) | undefined = meta?.onExportSettingsClick;
      if (!handleClick) return null;
      const showMarketplaceBadge: boolean =
        meta?.integrationBadgeIds?.has(product.id) ?? false;
      const status: string = meta?.integrationBadgeStatuses?.get(product.id) ?? "pending";
      const statusClasses: Record<string, string> = {
        active: "text-emerald-300 ring-1 ring-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15",
        pending: "text-amber-300 ring-1 ring-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15",
        failed: "text-rose-300 ring-1 ring-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15",
        removed: "text-gray-400 ring-1 ring-gray-500/20 bg-gray-500/10 hover:bg-gray-500/15",
      };
      const badgeClass: string =
        statusClasses[status] ??
        "text-slate-300 ring-1 ring-slate-500/20 bg-slate-500/10 hover:bg-slate-500/15";

      return (
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            onClick={(): void => handleClick(product)}
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer rounded-full text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label="View integrations"
          >
            <PlusCircle className="size-5" />
          </Button>
          {showMarketplaceBadge && (
            <Button
              type="button"
              onClick={(): void => handleExportClick?.(product)}
              variant="ghost"
              size="icon"
              className={`size-7 cursor-pointer rounded-full ${badgeClass}`}
              title={`Base.com status: ${status} - Click for export settings`}
              aria-label={`Base.com export settings - status: ${status}`}
            >
              <Bold className="size-3.5" />
            </Button>
          )}
        </div>
      );
    },
  },

  {
    id: "actions",
    cell: ({ row, table }: { row: Row<ProductWithImages>; table: Table<ProductWithImages> }): React.JSX.Element | null => {
      const meta: {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            onProductEditClick?: (p: ProductWithImages) => void;
            queryClient?: QueryClient;
          } | undefined = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            onProductEditClick?: (p: ProductWithImages) => void;
            queryClient?: QueryClient;
          }
        | undefined;

      const setRefreshTrigger: React.Dispatch<React.SetStateAction<number>> | undefined = meta?.setRefreshTrigger;
      const onProductEditClick: ((p: ProductWithImages) => void) | undefined = meta?.onProductEditClick;

      if (!setRefreshTrigger) return null;

      return (
        <ActionsCell
          row={row}
          setRefreshTrigger={setRefreshTrigger}
          onProductEditClick={onProductEditClick}
        />
      );
    },
  },
];
