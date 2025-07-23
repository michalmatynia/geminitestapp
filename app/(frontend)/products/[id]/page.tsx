import { getProductById } from "@/lib/services/productService";
import Image from "next/image";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return <div>Product not found</div>;
  }

  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].imageFile.filepath
      : "/placeholder.svg";

  return (
    <div className="container mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="relative h-96 w-full">
            <Image
              src={imageUrl}
              alt={product.name ?? "Product image"}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold my-4">${product.price}</p>
          <p className="text-gray-400">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
