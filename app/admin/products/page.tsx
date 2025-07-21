
import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

async function getProducts() {
  const products = await prisma.product.findMany({
    include: {
      images: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  return products;
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/create">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Product
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={products} />
    </div>
  );
}
