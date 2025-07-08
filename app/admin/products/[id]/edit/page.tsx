"use client";

import { Product, ProductImage, ImageFile } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import EditProductForm from "@/components/products/EditProductForm";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

export default function EditProductPage() {
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
    return <div>Loading...</div>;
  }

  return <EditProductForm product={product} />;
}
