import Image from 'next/image';
import Link from 'next/link';

import type { ProductWithImages } from '@/features/products/types';
import { MissingImagePlaceholder, ResourceCard } from '@/shared/ui';


interface ProductCardProps {
  product: ProductWithImages;
}

export default function ProductCard({ product }: ProductCardProps): React.JSX.Element {
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0]?.imageFile?.filepath ?? null)
      : null;

  // ✅ Localized name fallback: en -> pl -> de -> generic
  const name =
    product.name_en ??
    product.name_pl ??
    product.name_de ??
    'Product';

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <ResourceCard
        title={name}
        className="h-full"
        media={
          <div className="relative h-48 w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="rounded-md object-cover"
              />
            ) : (
              <MissingImagePlaceholder className="h-full w-full rounded-md" />
            )}
          </div>
        }
        footer={
          <p className="text-lg font-semibold">${product.price}</p>
        }
      />
    </Link>
  );
}
