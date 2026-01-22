"use client";

import Link from "next/link";
import FileManager from "@/components/files/FileManager";
import ProductForm from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";
import { ProductWithImages } from "@/types";

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

function EditProductForm() {
  const { showFileManager, handleMultiFileSelect, uploading, handleSubmit } = useProductFormContext();

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-4 border-b border-gray-800 pb-4">
        <Button 
          onClick={handleSubmit} 
          disabled={uploading} 
          aria-disabled={uploading}
          className="min-w-[100px]"
        >
          {uploading ? "Saving..." : "Update"}
        </Button>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="text-white hover:text-gray-300"
            aria-label="Back to products"
          >
            <ArrowLeftIcon className="size-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white leading-none">Edit Product</h1>
        </div>
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} showFileManager={showFileManager} />
      ) : (
        <ProductForm submitButtonText="Update" />
      )}
    </div>
  );
}

export default function EditProductPage({
  product,
}: {
  product: ProductWithImages;
}) {
  return (
    <ProductFormProvider product={product}>
      <EditProductForm />
    </ProductFormProvider>
  );
}
