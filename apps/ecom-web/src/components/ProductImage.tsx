import Image from 'next/image';
import type { JSX, SyntheticEvent } from 'react';
import {
  getProductImageFallbackSrc,
  getProductImageSrc,
  shouldBypassImageOptimization,
} from '@/lib/productImages';

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
  const fallbackImageUrl = getProductImageFallbackSrc(imageUrl);
  const usesNativeUploadImage = shouldBypassImageOptimization(resolvedImageUrl);
  const handleNativeImageError = (e: SyntheticEvent<HTMLImageElement>): void => {
    const image = e.currentTarget;
    if (fallbackImageUrl && image.getAttribute('src') !== fallbackImageUrl) {
      image.src = fallbackImageUrl;
      return;
    }
    image.style.display = 'none';
  };

  return (
    <div className={`${className} overflow-hidden`}>
      {/* Gradient always renders as placeholder/backdrop */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {resolvedImageUrl && usesNativeUploadImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedImageUrl}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: position,
          }}
          onError={handleNativeImageError}
        />
      )}
      {resolvedImageUrl && !usesNativeUploadImage && (
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
