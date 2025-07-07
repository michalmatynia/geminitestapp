"use client";

import Link from "next/link";
import { ProductFormProvider, useProductFormContext } from "@/lib/context/ProductFormContext";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";

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
  const {
    register,
    handleSubmit,
    errors,
    existingImageUrl,
    uploading,
    uploadError,
    previewUrl,
    showFileManager,
    setShowFileManager,
    handleImageChange,
    handleFileSelect,
  } = useProductFormContext();

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-4 flex items-center">
        <Link href="/admin" className="mr-4 text-white hover:text-gray-300">
          <ArrowLeftIcon className="size-6" />
        </Link>
        <h1 className="text-3xl font-bold text-white">Create Product</h1>
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleFileSelect} />
      ) : (
        <ProductForm
          register={register}
          handleSubmit={handleSubmit}
          errors={errors}
          handleImageChange={handleImageChange}
          setShowFileManager={setShowFileManager}
          previewUrl={previewUrl}
          existingImageUrl={existingImageUrl}
          uploading={uploading}
          uploadError={uploadError}
          submitButtonText="Create"
        />
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
