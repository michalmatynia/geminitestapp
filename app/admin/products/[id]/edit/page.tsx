import { Product, ProductImage, ImageFile } from "@prisma/client";

import EditProductForm from "@/components/products/EditProductForm";
import prisma from "@/lib/prisma";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

async function getProduct(id: string) {
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
  return product;
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return <div>Product not found</div>;
  }

  return <EditProductForm product={product as ProductWithImages} />;
}