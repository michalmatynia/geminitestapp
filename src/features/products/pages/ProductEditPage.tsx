import EditProductForm from "@/features/products/components/EditProductForm";
import { productService } from "@/features/products/services/productService";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await productService.getProductById(id);
  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
