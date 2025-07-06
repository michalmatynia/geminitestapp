"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import { useProductForm } from "@/lib/hooks/useProductForm";

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

interface EditProductPageProps {
  params: {
    id: string;
  };
}

interface ProductWithImages {
  id: string;
  name: string;
  price: number;
  images: {
    imageFile: {
      id: string;
      filepath: string;
    };
  }[];
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const [product, setProduct] = useState<ProductWithImages | undefined>();
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
  } = useProductForm(product);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then(setProduct);
  }, [params.id]);

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
          handleImageChange={handleImageChange}
          setShowFileManager={setShowFileManager}
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
