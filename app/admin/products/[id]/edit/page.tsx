"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setPrice(data.price.toString());
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, price: parseInt(price) }),
    });
    router.push("/admin");
  };

  return (
    <div className="bg-gray-950 p-6 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-4 text-white">Edit Product</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-400">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="price" className="block text-sm font-medium text-gray-400">Price</label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Update
        </button>
      </form>
    </div>
  );
}