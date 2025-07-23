"use client";

import { Product, ProductImage, ImageFile } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function ViewProductPage() {
  const params = useParams();
  const { id } = params;
  const [product, setProduct] = useState<ProductWithImages | null>(null);

  useEffect(() => {
    if (id) {
      void fetch(`/api/products/${id as string}`)
        .then((res) => res.json())
        .then((data: ProductWithImages) => setProduct(data));
    }
  }, [id]);

  if (!product) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin" className="mr-4 text-white hover:text-gray-300">
            <ArrowLeftIcon className="size-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Product Details</h1>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Name</label>
        <p className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 p-2 text-white sm:text-sm">
          {product.name}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">Price</label>
        <p className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 p-2 text-white sm:text-sm">
          ${product.price?.toFixed(2)}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">
          Created At
        </label>
        <p className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 p-2 text-white sm:text-sm">
          {new Date(product.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">
          Updated At
        </label>
        <p className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 p-2 text-white sm:text-sm">
          {new Date(product.updatedAt).toLocaleString()}
        </p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400">
          Product Images
        </label>
        {product.images && product.images.length > 0 ? (
          <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {product.images.map((imageRel) => (
              <div
                key={imageRel.imageFile.id}
                className="rounded-md bg-gray-900 p-4"
              >
                <Image
                  src={imageRel.imageFile.filepath}
                  alt={imageRel.imageFile.filename}
                  width={imageRel.imageFile.width || 500}
                  height={imageRel.imageFile.height || 500}
                  className="mb-2 h-32 w-full object-cover rounded-md"
                />
                <p className="text-sm text-white">
                  <span className="font-medium">Filename:</span>{" "}
                  {imageRel.imageFile.filename}
                </p>
                <p className="text-sm text-white">
                  <span className="font-medium">Size:</span>{" "}
                  {(imageRel.imageFile.size / 1024).toFixed(2)} KB
                </p>
                {imageRel.imageFile.width && imageRel.imageFile.height && (
                  <p className="text-sm text-white">
                    <span className="font-medium">Dimensions:</span>{" "}
                    {imageRel.imageFile.width}x{imageRel.imageFile.height}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-white">
            No images associated with this product.
          </p>
        )}
      </div>
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="inline-flex justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Edit Product
      </Link>
    </div>
  );
}

