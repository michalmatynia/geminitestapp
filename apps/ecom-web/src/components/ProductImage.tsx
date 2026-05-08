import Image from 'next/image';
import type { JSX } from 'react';
import { getProductImageSrc } from '@/lib/productImages';

export function ProductImage({
  imageUrl,
  gradient,
  alt,
  className = 'absolute inset-0',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
  fit = 'contain',
  position = 'center',
}: {
  imageUrl?: string;
  gradient: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
  position?: string;
}): JSX.Element {
  const resolvedImageUrl = getProductImageSrc(imageUrl);

  return (
    <div className={`${className} overflow-hidden`}>
      {/* Gradient always renders as placeholder/backdrop */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {resolvedImageUrl && (
        <Image
          src={resolvedImageUrl}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          style={{ objectFit: fit, objectPosition: position }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
