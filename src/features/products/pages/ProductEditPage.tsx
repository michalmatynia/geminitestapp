import EditProductForm from "@/features/products/components/EditProductForm";
import { productService } from "@/features/products/services/productService";
import { notFound } from "next/navigation";

import type { JSX } from "react";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const product = await productService.getProductById(id);
  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
