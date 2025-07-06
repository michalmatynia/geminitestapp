"use client"

import { useEffect, useState } from "react"
import { Product, columns } from "@/components/columns"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { getProducts } from "@/lib/api";

export default function AdminPage() {
  const [data, setData] = useState<Product[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [search, setSearch] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined)
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    const filters = { search, minPrice, maxPrice, startDate, endDate };
    getProducts(filters).then((data) => setData(data))
  }, [search, minPrice, maxPrice, startDate, endDate, refreshTrigger])

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
        <DataTable columns={columns} data={data} setRefreshTrigger={setRefreshTrigger} />
      </div>
    </div>
  )
}