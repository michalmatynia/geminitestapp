import { ProductWithImages } from "@/lib/types";
import EditProductForm from "@/components/products/EditProductForm";
import prisma from "@/lib/prisma";

async function getProduct(id: string): Promise<ProductWithImages | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  return product as ProductWithImages | null;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return <div>Product not found</div>;
  }

  return <EditProductForm product={product as ProductWithImages} />;
}