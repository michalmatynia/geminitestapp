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

interface ColumnActionsProps {
  row: any; // Adjust type as needed
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}

const handleDelete = async (id: string, setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>) => {
  const res = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (res.ok) {
    setRefreshTrigger(prev => prev + 1);
  } else {
    console.error("Failed to delete product:", await res.json());
  }
};

const ActionsCell: React.FC<ColumnActionsProps> = ({ row, setRefreshTrigger }) => {
  const product = row.original;

  if (!setRefreshTrigger) {
    return null; // Or handle the error appropriately
  }

  return (
    <div className="flex gap-2">
      <Link href={`/admin/products/${product.id}`}>
        <button className="text-gray-400 hover:text-white">View</button>
      </Link>
      <Link href={`/admin/products/${product.id}/edit`}>
        <button className="text-gray-400 hover:text-white">Edit</button>
      </Link>
      <button
        onClick={() => handleDelete(product.id, setRefreshTrigger)}
        className="text-gray-400 hover:text-white"
      >
        Delete
      </button>
    </div>
  );
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
    cell: ({ row, table }) => {
      const setRefreshTrigger = table.options.meta?.setRefreshTrigger;
      if (!setRefreshTrigger) return null; // Or handle the error appropriately
      return <ActionsCell row={row} setRefreshTrigger={setRefreshTrigger} />;
    },
  },
]