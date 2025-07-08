"use client";

import EditProductForm from "@/components/products/EditProductForm";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Product, ProductImage, ImageFile } from "@prisma/client";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

export default function EditProductPage() {
  const params = useParams();
  const { id } = params;
  const [product, setProduct] = useState<ProductWithImages | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/products/${id}`)
        .then((res) => res.json())
        .then((data) => setProduct(data));
    }
  }, [id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return <EditProductForm product={product} />;
}
