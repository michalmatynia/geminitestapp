"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";
import { ProductWithImages } from "@/lib/types";

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

function CreateProductForm() {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-4 flex items-center">
        <Link
          href="/admin/products"
          className="mr-4 text-white hover:text-gray-300"
          aria-label="Back to products"
        >
          <ArrowLeftIcon className="size-6" />
        </Link>
        <h1 className="text-3xl font-bold text-white">Create Product</h1>
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText="Create" />
      )}
    </div>
  );
}

export default function CreateProductPage() {
  const router = useRouter();
  const [initialSku, setInitialSku] = useState<string>("");

  useEffect(() => {
    const requestSku = async () => {
      while (true) {
        const skuInput = window.prompt("Enter a new unique SKU:");
        if (skuInput === null) {
          router.push("/admin/products");
          return;
        }
        const sku = skuInput.trim().toUpperCase();
        const skuPattern = /^[A-Z0-9]+$/;
        if (!sku) {
          alert("SKU is required.");
          continue;
        }
        if (!skuPattern.test(sku)) {
          alert("SKU must use uppercase letters and numbers only.");
          continue;
        }
        const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
        if (res.ok) {
          const products = (await res.json()) as ProductWithImages[];
          const skuExists = products.some((product) => product.sku === sku);
          if (skuExists) {
            alert("SKU already exists.");
            continue;
          }
        }
        setInitialSku(sku);
        return;
      }
    };

    if (!initialSku) {
      void requestSku();
    }
  }, [initialSku, router]);

  if (!initialSku) {
    return null;
  }

  return (
    <ProductFormProvider initialSku={initialSku}>
      <CreateProductForm />
    </ProductFormProvider>
  );
}
