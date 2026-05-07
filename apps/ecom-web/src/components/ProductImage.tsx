import Image from 'next/image';
import type { JSX } from 'react';

/**
 * Renders a product image when `imageUrl` is available, falling back to the
 * CSS gradient when it is not. Renders as an absolutely-positioned wrapper
 * inside a relative parent with defined dimensions.
 *
 * Pass `className` to apply animation / hover classes (e.g. `card-image`).
 */
export function ProductImage({
  imageUrl,
  gradient,
  alt,
  className = 'absolute inset-0',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
  fit = 'cover',
  position = 'center top',
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
  return (
    <div className={`${className} overflow-hidden`}>
      {/* Gradient is always rendered — acts as placeholder while image loads */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {imageUrl && (
        <Image
          src={imageUrl}
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
