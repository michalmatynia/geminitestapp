"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import Link from "next/link"
import Image from "next/image"


import { deleteProduct } from "@/app/actions";

export type Product = {
  id: string
  name: string
  price: number
  createdAt: string
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
}

const ActionsCell: React.FC<{ row: Row<Product> }> = ({ row }) => {
  const product = row.original;

  return (
    <div className="flex gap-2">
      <Link href={`/admin/products/${product.id}`}>
        <button className="text-muted-foreground hover:text-foreground">View</button>
      </Link>
      <Link href={`/admin/products/${product.id}/edit`}>
        <button className="text-muted-foreground hover:text-foreground">Edit</button>
      </Link>
      <button
        onClick={async () => {
          if (confirm("Are you sure you want to delete this product?")) {
            await deleteProduct(product.id);
          }
        }}
        className="text-destructive hover:text-destructive/80"
      >
        Delete
      </button>
    </div>
  );
};

import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

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
      const imageUrl = product.images && product.images.length > 0 ? product.images[0].imageFile.filepath : undefined;
      return imageUrl ? <Image src={imageUrl} alt="Product Image" width={64} height={64} className="size-16 object-cover rounded-md" /> : null;
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
      )
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
      )
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
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return <ActionsCell row={row} />;
    },
  },
]