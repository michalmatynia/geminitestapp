import { productService } from "@/lib/services/productService";
import Image from "next/image";
import MissingImagePlaceholder from "@/components/products/MissingImagePlaceholder";

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const product = await productService.getProductById(id);

  if (!product) {
    return <div>Product not found</div>;
  }

  const title =
    product.name_en ?? product.name_pl ?? product.name_de ?? "Product";

  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].imageFile.filepath
      : null;

  const priceLabel =
    typeof product.price === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(product.price)
      : "—";

  const description =
    product.description_en ??
    product.description_pl ??
    product.description_de ??
    "";

  return (
    <div className="container mx-auto py-12">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <div className="relative h-96 w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${title} image`}
                fill
                className="rounded-lg object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <MissingImagePlaceholder className="h-full w-full rounded-lg" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="my-4 text-2xl font-semibold">{priceLabel}</p>
          {description ? (
            <p className="text-gray-400">{description}</p>
          ) : (
            <p className="text-gray-500">No description available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
