"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Bold, Download, MoreVertical, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useToast } from "@/shared/ui/toast";
import { EditableCell } from "@/features/products/components/EditableCell";
import { ProductImageCell } from "@/features/products/components/cells/ProductImageCell";
import type { ProductWithImages } from "@/features/products/types";
import type { PriceGroupForCalculation } from "@/shared/components/data-table";

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = "name_en" | "name_pl" | "name_de";

// ✅ Use the real toast function type from your hook (no more variant mismatch)
type ToastFn = ReturnType<typeof useToast>["toast"];

/**
 * Calculates the price for a product in the specified currency.
 * Uses price group relationships to convert between currencies.
 */
function normalizeCurrencyCode(code?: string | null) {
  return (code ?? "").trim().toUpperCase();
}

function getGroupCurrencyCode(group: PriceGroupForCalculation) {
  return normalizeCurrencyCode(group.currency?.code || group.currencyCode || group.groupId);
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

  const normalizedTarget = normalizeCurrencyCode(targetCurrencyCode);

  const defaultGroup =
    (defaultPriceGroupId
      ? priceGroups.find((g) => g.id === defaultPriceGroupId)
      : undefined) ?? priceGroups.find((g) => g.isDefault) ?? priceGroups[0];

  if (!defaultGroup) {
    return {
      price: basePrice,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizedTarget,
    };
  }

  const baseCurrencyCode = getGroupCurrencyCode(defaultGroup);

  if (baseCurrencyCode && baseCurrencyCode === normalizedTarget) {
    return { price: basePrice, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  const findGroupById = (id?: string | null) =>
    id ? priceGroups.find((g) => g.id === id || g.groupId === id) : undefined;

  const resolvePriceForGroup = (
    group: PriceGroupForCalculation | undefined,
    visited = new Set<string>()
  ): number | null => {
    if (!group) return null;
    const key = group.id || group.groupId;
    if (key) {
      if (visited.has(key)) return null;
      visited.add(key);
    }

    if (group.id === defaultGroup.id || group.groupId === defaultGroup.groupId) {
      return basePrice;
    }

    if (group.type === "dependent" && group.sourceGroupId) {
      const source = findGroupById(group.sourceGroupId);
      const sourcePrice = resolvePriceForGroup(source, visited);
      if (sourcePrice === null) return null;
      const multiplier = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
      const addToPrice = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
      return sourcePrice * multiplier + addToPrice;
    }

    return null;
  };

  const targetGroup = priceGroups.find((group) => {
    const groupCode = getGroupCurrencyCode(group);
    return groupCode === normalizedTarget || normalizeCurrencyCode(group.groupId) === normalizedTarget;
  });

  const resolved = resolvePriceForGroup(targetGroup);
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
  notify?: ToastFn
) => {
  if (!window.confirm("Are you sure you want to delete this product?")) return;

  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  if (res.ok) {
    setRefreshTrigger((prev) => prev + 1);
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
}) => {
  const product = row.original;
  const router = useRouter();
  const { toast } = useToast();

  const handleDuplicate = async () => {
    const sku = window.prompt("Enter a new unique SKU for the duplicate:");
    if (sku === null) return;

    const trimmedSku = sku.trim().toUpperCase();
    const skuPattern = /^[A-Z0-9]+$/;

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

    const res = await fetch(`/api/products/${product.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: trimmedSku }),
    });

    if (res.ok) {
      const duplicated = (await res.json()) as { id?: string };
      setRefreshTrigger((prev) => prev + 1);

      if (duplicated.id) {
        toast("Product duplicated.", { variant: "success" });
        router.push(`/admin/products/${duplicated.id}/edit`);
      }
      return;
    }

    const error = (await res.json()) as { error?: string };
    toast(error.error || "Failed to duplicate product.", { variant: "error" });
  };

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-800 hover:text-white"
            aria-label="Open row actions"
            type="button"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onProductEditClick?.(product);
            }}
          >
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleDuplicate();
            }}
          >
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              void handleDelete(product.id, setRefreshTrigger, toast);
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
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "images",
    header: "Image",
    cell: ({ row }) => {
      const product = row.original;
      
      const firstFileImage = product.images?.find(
        (img) => img.imageFile?.filepath
      )?.imageFile.filepath;

      const firstLinkImage = product.imageLinks?.find(
        (link) => link && link.trim().length > 0
      );

      const imageUrl = firstFileImage || firstLinkImage;

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
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row, table }) => {
      const product = row.original;

      const meta = table.options.meta as
        | {
            productNameKey?: ProductNameKey;
            onProductNameClick?: (p: ProductWithImages) => void;
          }
        | undefined;

      const nameKey: ProductNameKey = meta?.productNameKey ?? "name_en";
      const nameValue =
        product[nameKey] ??
        product.name_en ??
        product.name_pl ??
        product.name_de;

      const handleNameClick = meta?.onProductNameClick;

      const isImported = !!product.baseProductId;

      return (
        <div>
          {handleNameClick ? (
            <Button
              variant="ghost"
              className="h-auto w-full cursor-pointer justify-start p-0 text-left text-sm font-normal text-white/90 transition-colors hover:bg-transparent hover:text-white/70 whitespace-normal break-words"
              onClick={() => handleNameClick(product)}
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
    header: ({ column, table }) => {
      const meta = table.options.meta as
        | { currencyCode?: string }
        | undefined;
      const currencyCode = meta?.currencyCode || "";

      return (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          Price {currencyCode && <span className="ml-1 text-xs text-muted-foreground">({currencyCode})</span>}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row, table }) => {
      const product = row.original;
      const meta = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            currencyCode?: string;
            priceGroups?: PriceGroupForCalculation[];
          }
        | undefined;

      const setRefreshTrigger = meta?.setRefreshTrigger;
      const currencyCode = meta?.currencyCode || "";
      const priceGroups = meta?.priceGroups || [];

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
      const showCurrencyIndicator = actualCurrency && actualCurrency !== currencyCode;
      const hasConvertedPrice =
        displayPrice !== null &&
        product.price !== null &&
        baseCurrencyCode &&
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
              {displayPrice.toFixed(2)}
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
            onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
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
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Stock
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row, table }) => {
      const product = row.original;
      const meta = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
          }
        | undefined;

      const setRefreshTrigger = meta?.setRefreshTrigger;
      if (!setRefreshTrigger) {
        return <div>{product.stock !== null ? product.stock : "-"}</div>;
      }

      return (
        <EditableCell
          value={product.stock}
          productId={product.id}
          field="stock"
          onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
        />
      );
    },
  },

  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Created At
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
  },

  {
    id: "integrations",
    header: "",
    cell: ({ row, table }) => {
      const product = row.original;
      const meta = table.options.meta as
        | {
            onIntegrationsClick?: (p: ProductWithImages) => void;
            onExportSettingsClick?: (p: ProductWithImages) => void;
            integrationBadgeIds?: Set<string>;
            integrationBadgeStatuses?: Map<string, string>;
          }
        | undefined;

      const handleClick = meta?.onIntegrationsClick;
      const handleExportClick = meta?.onExportSettingsClick;
      if (!handleClick) return null;
      const showMarketplaceBadge =
        meta?.integrationBadgeIds?.has(product.id) ?? false;
      const status = meta?.integrationBadgeStatuses?.get(product.id) ?? "pending";
      const statusClasses: Record<string, string> = {
        active: "text-emerald-300 ring-1 ring-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15",
        pending: "text-amber-300 ring-1 ring-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15",
        failed: "text-rose-300 ring-1 ring-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15",
        removed: "text-gray-400 ring-1 ring-gray-500/20 bg-gray-500/10 hover:bg-gray-500/15",
      };
      const badgeClass =
        statusClasses[status] ??
        "text-slate-300 ring-1 ring-slate-500/20 bg-slate-500/10 hover:bg-slate-500/15";

      return (
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            onClick={() => handleClick(product)}
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
              onClick={() => handleExportClick?.(product)}
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
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | {
            setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
            onProductEditClick?: (p: ProductWithImages) => void;
          }
        | undefined;

      const setRefreshTrigger = meta?.setRefreshTrigger;
      const onProductEditClick = meta?.onProductEditClick;

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
