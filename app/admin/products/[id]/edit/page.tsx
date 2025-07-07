import { PrismaClient } from "@prisma/client";
import EditProductForm from "@/components/products/EditProductForm";

const prisma = new PrismaClient();

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = await params;
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

  if (!product) {
    return <div>Product not found</div>;
  }

  return <EditProductForm product={product} />;
}
