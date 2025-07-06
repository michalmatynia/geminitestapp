"use client"

import { useEffect, useState } from "react"
import { Product, columns } from "@/components/columns"
import { DataTable } from "@/components/data-table"

async function getData(): Promise<Product[]> {
  const res = await fetch("/api/products")
  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }
  return res.json()
}

export default function AdminPage() {
  const [data, setData] = useState<Product[]>([])

  useEffect(() => {
    getData().then((data) => setData(data))
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="bg-gray-950 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-white">Products</h1>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}