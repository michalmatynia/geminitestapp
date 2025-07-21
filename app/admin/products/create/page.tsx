"use client";

import Link from "next/link";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";

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
  const { showFileManager, handleFileSelect } = useProductFormContext();

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
        <FileManager onSelectFile={handleFileSelect} />
      ) : (
        <ProductForm submitButtonText="Create" />
      )}
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <ProductFormProvider>
      <CreateProductForm />
    </ProductFormProvider>
  );
}
