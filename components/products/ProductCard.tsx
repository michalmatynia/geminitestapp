import Image from "next/image";
import Link from "next/link";
import { ProductWithImages } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MissingImagePlaceholder from "./MissingImagePlaceholder";

interface ProductCardProps {
  product: ProductWithImages;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].imageFile.filepath
      : null;

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full">
        <CardHeader>
          <div className="relative h-48 w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name ?? "Product image"}
                fill
                className="object-cover rounded-t-lg"
              />
            ) : (
              <MissingImagePlaceholder className="h-full w-full rounded-t-lg" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-lg">{product.name}</CardTitle>
        </CardContent>
        <CardFooter>
          <p className="text-lg font-semibold">
            ${product.price}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
