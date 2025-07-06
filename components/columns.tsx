"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useRouter } from "next/navigation"

export type Product = {
  id: string
  name: string
  price: number
  createdAt: string
}

const handleDelete = async (id: string) => {
  await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  window.location.reload();
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "price",
    header: "Price",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original
 
      return (
        <div className="flex gap-2">
          <Link href={`/admin/products/${product.id}/edit`}>
            <button className="text-gray-400 hover:text-white">Edit</button>
          </Link>
          <button
            onClick={() => handleDelete(product.id)}
            className="text-gray-400 hover:text-white"
          >
            Delete
          </button>
        </div>
      )
    },
  },
]
