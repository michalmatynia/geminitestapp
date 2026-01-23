"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Download, MoreVertical, PlusCircle, Store } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import MissingImagePlaceholder from "@/components/ui/missing-image-placeholder";
import { EditableCell } from "@/components/products/EditableCell";
import { ProductImageCell } from "@/components/products/cells/ProductImageCell";
import type { ProductWithImages } from "@/types";
import type { PriceGroupForCalculation } from "@/components/data-table";

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = "name_en" | "name_pl" | "name_de";

// ✅ Use the real toast function type from your hook (no more variant mismatch)
type ToastFn = ReturnType<typeof useToast>["toast"];

/**
 * Calculates the price for a product in the specified currency.
 * Uses price group relationships to convert between currencies.
 */
function calculatePriceForCurrency(
  basePrice: number | null,
  defaultPriceGroupId: string | null,
  targetCurrencyCode: string,
  priceGroups: PriceGroupForCalculation[]
): { price: number | null; currencyCode: string } {
  if (basePrice === null || !priceGroups.length) {
    return { price: null, currencyCode: targetCurrencyCode };
  }

  // Find the product's default price group (the currency of the stored price)
  const defaultGroup = defaultPriceGroupId
    ? priceGroups.find((g) => g.id === defaultPriceGroupId)
    : priceGroups.find((g) => (g as any).isDefault);

  if (!defaultGroup) {
    // No default group found, return base price with target currency
    return { price: basePrice, currencyCode: targetCurrencyCode };
  }

  const baseCurrencyCode = defaultGroup.currency.code;

  // If the target currency matches the base currency, return the base price
  if (baseCurrencyCode === targetCurrencyCode) {
    return { price: basePrice, currencyCode: targetCurrencyCode };
  }

  // Find a price group for the target currency
  const targetGroup = priceGroups.find((g) => g.currency.code === targetCurrencyCode);

  if (!targetGroup) {
    // No price group for target currency, return base price with its original currency
    return { price: basePrice, currencyCode: baseCurrencyCode };
  }

  // If target group is dependent and its source is the default group, calculate the price
  if (targetGroup.type === "dependent" && targetGroup.sourceGroupId === defaultGroup.id) {
    const calculatedPrice = basePrice * targetGroup.priceMultiplier + targetGroup.addToPrice;
    return { price: calculatedPrice, currencyCode: targetCurrencyCode };
  }

  // If target group is standard (not dependent), we can't calculate
  // Check if there's a dependent group from target that sources from default
  const dependentFromDefault = priceGroups.find(
    (g) => g.currency.code === targetCurrencyCode && g.sourceGroupId === defaultGroup.id
  );

  if (dependentFromDefault) {
    const calculatedPrice = basePrice * dependentFromDefault.priceMultiplier + dependentFromDefault.addToPrice;
    return { price: calculatedPrice, currencyCode: targetCurrencyCode };
  }

  // Can't convert - return base price with original currency
  return { price: basePrice, currencyCode: baseCurrencyCode };
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
          <button
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-800 hover:text-white"
            aria-label="Open row actions"
            type="button"
          >
            <MoreVertical className="size-4" />
          </button>
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
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
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
            <button
              className="text-left text-white hover:underline"
              onClick={() => handleNameClick(product)}
              type="button"
            >
              {nameValue || "—"}
            </button>
          ) : (
            <span>{nameValue || "—"}</span>
          )}

          {product.sku && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>{product.sku}</span>
              {isImported && (
                <Download
                  className="size-3 text-blue-400"
                  title="Imported product"
                  aria-label="Imported product"
                />
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
      const { price: displayPrice, currencyCode: actualCurrency } = calculatePriceForCurrency(
        product.price,
        product.defaultPriceGroupId,
        currencyCode,
        priceGroups
      );

      // Show currency indicator if different from selected
      const showCurrencyIndicator = actualCurrency && actualCurrency !== currencyCode;

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

      // For editable cells, we still show the base price but with currency context
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
        active: "text-emerald-300",
        pending: "text-yellow-300",
        failed: "text-red-300",
        removed: "text-gray-400",
      };
      const badgeClass = statusClasses[status] ?? "text-gray-300";

      return (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleClick(product)}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-800 hover:text-emerald-400"
            aria-label="View integrations"
          >
            <PlusCircle className="size-5" />
          </button>
          {showMarketplaceBadge && (
            <button
              type="button"
              onClick={() => handleExportClick?.(product)}
              className={`inline-flex size-6 items-center justify-center rounded-full hover:bg-gray-800 ${badgeClass}`}
              title={`Marketplace status: ${status} - Click for export settings`}
              aria-label={`Export settings - status: ${status}`}
            >
              <Store className="size-3.5" />
            </button>
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
