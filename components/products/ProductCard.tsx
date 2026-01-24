import Image from "next/image";
import Link from "next/link";
import type { ProductWithImages } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MissingImagePlaceholder from "@/components/ui/missing-image-placeholder";

interface ProductCardProps {
  product: ProductWithImages;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0]?.imageFile?.filepath ?? null)
      : null;

  // ✅ Localized name fallback: en -> pl -> de -> generic
  const name =
    product.name_en ??
    product.name_pl ??
    product.name_de ??
    "Product";

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full">
        <CardHeader>
          <div className="relative h-48 w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="rounded-t-lg object-cover"
              />
            ) : (
              <MissingImagePlaceholder className="h-full w-full rounded-t-lg" />
            )}
          </div>
        </CardHeader>

        <CardContent>
          <CardTitle className="text-lg">{name}</CardTitle>
        </CardContent>

        <CardFooter>
          <p className="text-lg font-semibold">${product.price}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
