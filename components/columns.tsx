"use client";

import { ColumnDef } from "@tanstack/react-table";
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

export type Product = {
  id: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  sku: string | null;
  price: number | null;
  createdAt: Date;
  updatedAt: Date;
  images: {
    imageFile: {
      id: string;
      filename: string;
      filepath: string;
      mimetype: string;
      size: number;
      width?: number | null;
      height?: number | null;
    };
  }[];
};

interface ColumnActionsProps {
  row: { original: Product };
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  onProductEditClick?: (row: Product) => void;
}

// The `handleDelete` function sends a DELETE request to the API to delete a
// product. If the request is successful, it triggers a refresh of the
// product list.
const handleDelete = async (
  id: string,
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>
) => {
  if (!window.confirm("Are you sure you want to delete this product?")) {
    return;
  }
  const res = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (res.ok) {
    setRefreshTrigger((prev) => prev + 1);
  } else {
    console.error("Failed to delete product:", await res.json());
  }
};

// The `ActionsCell` component renders the actions for a single product row,
// including a link to edit the product, and a button to delete it.
const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
  setRefreshTrigger,
  onProductEditClick,
}) => {
  const product = row.original;
  const router = useRouter();

  const handleDuplicate = async () => {
    const sku = window.prompt("Enter a new unique SKU for the duplicate:");
    if (sku === null) return;
    const trimmedSku = sku.trim().toUpperCase();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!trimmedSku) {
      alert("SKU is required.");
      return;
    }
    if (!skuPattern.test(trimmedSku)) {
      alert("SKU must use uppercase letters and numbers only.");
      return;
    }
    const res = await fetch(`/api/products/${product.id}/duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sku: trimmedSku }),
    });
    if (res.ok) {
      const duplicated = (await res.json()) as { id?: string };
      setRefreshTrigger((prev) => prev + 1);
      if (duplicated.id) {
        router.push(`/admin/products/${duplicated.id}/edit`);
      }
    } else {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to duplicate product.");
    }
  };

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-800 hover:text-white"
            aria-label="Open row actions"
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
          <DropdownMenuItem onSelect={handleDuplicate}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              void handleDelete(product.id, setRefreshTrigger);
            }}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const columns: ColumnDef<Product>[] = [
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
          ? product.images[0].imageFile.filepath
          : undefined;
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt="Product Image"
          width={64}
          height={64}
          className="size-16 object-cover rounded-md"
        />
      ) : null;
    },
  },
  {
    accessorKey: "name_en",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
        >
          Name
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row, table }) => {
      const product = row.original;
      const nameKey = table.options.meta?.productNameKey ?? "name_en";
      const nameValue =
        product[nameKey] ?? product.name_en ?? product.name_pl ?? product.name_de;
      const handleNameClick = table.options.meta?.onProductNameClick;
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
            <div className="text-sm text-gray-500">{product.sku}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
        >
          Price
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
        >
          Created At
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const setRefreshTrigger = table.options.meta?.setRefreshTrigger;
      const onProductEditClick = table.options.meta?.onProductEditClick;
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
