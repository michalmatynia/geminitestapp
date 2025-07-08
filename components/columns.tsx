"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type Product = {
  id: string;
  name: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  images: {
    imageFile: {
      id: string;
      filename: string;
      filepath: string;
      mimetype: string;
      size: number;
      width?: number;
      height?: number;
    };
  }[];
};

interface ColumnActionsProps {
  row: { original: Product };
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}

// The `handleDelete` function sends a DELETE request to the API to delete a
// product. If the request is successful, it triggers a refresh of the
// product list.
const handleDelete = async (
  id: string,
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>
) => {
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
// including links to view and edit the product, and a button to delete it.
const ActionsCell: React.FC<ColumnActionsProps> = ({
  row,
  setRefreshTrigger,
}) => {
  const product = row.original;

  return (
    <div className="flex gap-2">
      <Link href={`/admin/products/${product.id}`}>
        <button className="text-muted-foreground hover:text-foreground">
          View
        </button>
      </Link>
      <Link href={`/admin/products/${product.id}/edit`}>
        <button className="text-muted-foreground hover:text-foreground">
          Edit
        </button>
      </Link>
      <button
        onClick={() => {
          void handleDelete(product.id, setRefreshTrigger);
        }}
        className="text-destructive hover:text-destructive/80"
      >
        Delete
      </button>
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
    accessorKey: "name",
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
      if (!setRefreshTrigger) return null;
      return <ActionsCell row={row} setRefreshTrigger={setRefreshTrigger} />;
    },
  },
];
