"use client";

import { useEffect, useState } from "react";

import { columns, Product } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { getProducts } from "@/lib/api";
import { ProductWithImages } from "@/lib/types";

export default function AdminPage() {
  const [data, setData] = useState<ProductWithImages[]>([]);
  // The refreshTrigger state is used to force a re-fetch of the products
  // when a product is deleted.
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [search, setSearch] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const filters = { search, minPrice, maxPrice, startDate, endDate };
    void getProducts(filters).then(setData);
  }, [search, minPrice, maxPrice, startDate, endDate, refreshTrigger]);

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-white">Products</h1>
        <div className="mb-4 flex space-x-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Input
            type="number"
            placeholder="Min Price"
            value={minPrice || ""}
            onChange={(e) =>
              setMinPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPrice || ""}
            onChange={(e) =>
              setMaxPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data}
          setRefreshTrigger={setRefreshTrigger}
        />
      </div>
    </div>
  );
}