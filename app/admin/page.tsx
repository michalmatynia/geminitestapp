"use client"

import { useEffect, useState } from "react"
import { Product, columns } from "@/components/columns"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

async function getData(filters: { search?: string; minPrice?: number; maxPrice?: number; startDate?: string; endDate?: string }): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const res = await fetch(`/api/products?${params.toString()}`)
  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }
  return res.json()
}

export default function AdminPage() {
  const [data, setData] = useState<Product[]>([])
  const [search, setSearch] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined)
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    const filters = { search, minPrice, maxPrice, startDate, endDate };
    getData(filters).then((data) => setData(data))
  }, [search, minPrice, maxPrice, startDate, endDate])

  return (
    <div className="container mx-auto py-10">
      <div className="bg-gray-950 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-white">Products</h1>
        <div className="flex space-x-4 mb-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              console.log("Search value:", e.target.value);
            }}
            className="max-w-sm"
          />
          <Input
            type="number"
            placeholder="Min Price"
            value={minPrice || ''}
            onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPrice || ''}
            onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
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
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}