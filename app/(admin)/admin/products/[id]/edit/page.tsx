import EditProductForm from "@/components/products/EditProductForm";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";
import type { ProductWithImages } from "@/lib/types";

async function getProduct(id: string): Promise<{
  product: ProductWithImages | null;
  errorId?: string;
}> {
  try {
    const product = await productService.getProductById(id);
    return { product };
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][EDIT] Failed to load product", {
      errorId,
      productId: id,
      error,
    });
    return { product: null, errorId };
  }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { product, errorId } = await getProduct(id);

  if (!product) {
    if (errorId) {
      return <div>Failed to load product. Error ID: {errorId}</div>;
    }
    return <div>Product not found</div>;
  }

  return <EditProductForm product={product} />;
}
