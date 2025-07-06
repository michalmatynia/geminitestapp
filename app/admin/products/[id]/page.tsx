"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/components/columns";

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 5 7 7-7 7" />
      <path d="M5 12h14" />
    </svg>
  );
}

interface ViewProductPageProps {
  params: {
    id: string;
  };
}

export default function ViewProductPage({ params }: ViewProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const router = useRouter();
  const { id } = React.use(params);

  useEffect(() => {
    const fetchProductData = async () => {
      const [productRes, allProductsRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch(`/api/products`),
      ]);

      const productData: Product = await productRes.json();
      const allProductsData: Product[] = await allProductsRes.json();

      if (productData) {
        setProduct(productData);
      }
      if (allProductsData) {
        setAllProducts(allProductsData);
        const index = allProductsData.findIndex((p) => p.id === id);
        setCurrentIndex(index);
      }
    };

    fetchProductData();
  }, [id]);

  const goToPreviousProduct = () => {
    if (currentIndex > 0) {
      router.push(`/admin/products/${allProducts[currentIndex - 1].id}`);
    }
  };

  const goToNextProduct = () => {
    if (currentIndex < allProducts.length - 1) {
      router.push(`/admin/products/${allProducts[currentIndex + 1].id}`);
    }
  };

  if (!product) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="bg-gray-950 p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Link href="/admin" className="text-white hover:text-gray-300 mr-4">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Product Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousProduct}
            disabled={currentIndex === 0}
            className="text-white enabled:hover:text-gray-300 disabled:opacity-50"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <span className="text-white text-sm">
            {currentIndex + 1} / {allProducts.length}
          </span>
          <button
            onClick={goToNextProduct}
            disabled={currentIndex === allProducts.length - 1}
            className="text-white enabled:hover:text-gray-300 disabled:opacity-50"
          >
            <ArrowRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Name</label>
        <p className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white sm:text-sm p-2">
          {product.name}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Price</label>
        <p className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white sm:text-sm p-2">
          ${product.price.toFixed(2)}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Created At</label>
        <p className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white sm:text-sm p-2">
          {new Date(product.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Updated At</label>
        <p className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white sm:text-sm p-2">
          {new Date(product.updatedAt).toLocaleString()}
        </p>
      </div>
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Edit Product
      </Link>
    </div>
  );
}
