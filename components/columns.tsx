"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreVertical } from "lucide-react";
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
import MissingImagePlaceholder from "@/components/products/MissingImagePlaceholder";
import type { ProductWithImages } from "@/lib/types";

// Keep the exported name `Product` in case other files import it from here.
export type Product = ProductWithImages;

type ProductNameKey = "name_en" | "name_pl" | "name_de";

type ToastFn = (
  message: string,
  options?: { variant?: "success" | "error" | "info" | "warning" }
) => void;

interface ColumnActionsProps {
  row: { original: Product };
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  onProductEditClick?: (row: Product) => void;
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
    // best-effort read error body for console
    // eslint-disable-next-line no-console
    console.error("Failed to delete product:", await res.json());
  } catch {
    // eslint-disable-next-line no-console
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
      const imageUrl =
        product.images && product.images.length > 0
          ? product.images[0]?.imageFile?.filepath
          : undefined;

      return imageUrl ? (
        <Image
          src={imageUrl}
          alt="Product Image"
          width={64}
          height={64}
          className="size-16 rounded-md object-cover"
        />
      ) : (
        <MissingImagePlaceholder className="size-16" />
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

      // Safe fallback order if a localized field is missing/null.
      const nameValue =
        (product as any)[nameKey] ??
        (product as any).name_en ??
        (product as any).name_pl ??
        (product as any).name_de;

      const handleNameClick = meta?.onProductNameClick;

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

          {(product as any).sku && (
            <div className="text-sm text-gray-500">{(product as any).sku}</div>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Price
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
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
          row={row as any}
          setRefreshTrigger={setRefreshTrigger}
          onProductEditClick={onProductEditClick}
        />
      );
    },
  },
];
