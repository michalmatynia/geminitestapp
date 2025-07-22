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

interface ProductCardProps {
  product: ProductWithImages;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].imageFile.filepath
      : "/placeholder.svg";

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full">
        <CardHeader>
          <div className="relative h-48 w-full">
            <Image
              src={imageUrl}
              alt={product.name ?? "Product image"}
              fill
              className="object-cover rounded-t-lg"
            />
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
