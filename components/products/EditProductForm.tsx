"use client";

import Link from "next/link";
import { ProductFormProvider, useProductFormContext } from "@/lib/context/ProductFormContext";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import { Product } from "@prisma/client";
import { ProductImage, ImageFile } from "@prisma/client";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

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
  const {
    register,
    handleSubmit,
    errors,
    setValue,
    existingImageUrl,
    uploading,
    uploadError,
    previewUrl,
    showFileManager,
    setShowFileManager,
    handleImageChange,
    handleFileSelect,
    handleDisconnectImage,
  } = useProductFormContext();

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-4 flex items-center">
        <Link href="/admin/products" className="mr-4 text-white hover:text-gray-300">
          <ArrowLeftIcon className="size-6" />
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Product</h1>
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleFileSelect} />
      ) : (
        <ProductForm
          register={register}
          handleSubmit={handleSubmit}
          errors={errors}
          setValue={setValue}
          handleImageChange={handleImageChange}
          setShowFileManager={setShowFileManager}
          handleDisconnectImage={handleDisconnectImage}
          previewUrl={previewUrl}
          existingImageUrl={existingImageUrl}
          uploading={uploading}
          uploadError={uploadError}
          submitButtonText="Update"
        />
      )}
    </div>
  );
}

export default function EditProductPage({ product }: { product: ProductWithImages }) {
  return (
    <ProductFormProvider product={product}>
      <EditProductForm />
    </ProductFormProvider>
  );
}
