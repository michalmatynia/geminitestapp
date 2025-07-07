import { Suspense } from "react";
import { getProductsAction, seedDatabase } from "@/app/actions";
import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  startDate?: string;
  endDate?: string;
};

function PageSkeleton() {
  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="h-9 bg-gray-800 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-36 animate-pulse"></div>
        </div>
        <div className="mb-4 flex space-x-4">
          <div className="h-10 bg-gray-800 rounded w-full max-w-sm animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-full max-w-xs animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-full max-w-xs animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-full max-w-xs animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-full max-w-xs animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-20 animate-pulse"></div>
        </div>
        <div className="border rounded-md p-4">
          <div className="h-8 bg-gray-800 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-8 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-8 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsView({
  products,
  search,
  minPrice,
  maxPrice,
  startDate,
  endDate,
}: {
  products: Product[];
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  startDate?: string;
  endDate?: string;
}) {
  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <form action="/admin" method="POST">
            <Button formAction={seedDatabase} type="submit">
              Seed Database
            </Button>
          </form>
        </div>
        <form method="GET" className="mb-4 flex space-x-4">
          <Input
            placeholder="Search by name..."
            name="search"
            defaultValue={search}
            className="max-w-sm"
          />
          <Input
            type="number"
            placeholder="Min Price"
            name="minPrice"
            defaultValue={minPrice}
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Max Price"
            name="maxPrice"
            defaultValue={maxPrice}
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="Start Date"
            name="startDate"
            defaultValue={startDate}
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="End Date"
            name="endDate"
            defaultValue={endDate}
            className="max-w-xs"
          />
          <Button type="submit">Filter</Button>
        </form>
        <DataTable columns={columns} data={products} />
      </div>
    </div>
  );
}

async function AdminPageContent({
  search,
  minPrice,
  maxPrice,
  startDate,
  endDate,
}: SearchParams) {
  const filters = {
    search,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    startDate,
    endDate,
  };

  const products = await getProductsAction(filters);

  return (
    <ProductsView
      products={products}
      search={search}
      minPrice={minPrice}
      maxPrice={maxPrice}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminPageContent
        search={searchParams.search}
        minPrice={searchParams.minPrice}
        maxPrice={searchParams.maxPrice}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
      />
    </Suspense>
  );
}
