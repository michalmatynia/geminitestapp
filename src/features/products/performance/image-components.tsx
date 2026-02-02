"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { imageUrlGenerator, type ImageFormat, type ImageSize } from './image-url-generator';

type OptimizedImageProps = {
  imageId: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

export function OptimizedImage({
  imageId,
  alt,
  imageSize = 'medium',
  className,
  priority = false,
  onLoad,
  onError
}: OptimizedImageProps): React.JSX.Element {
  const [format, setFormat] = useState<ImageFormat>((): ImageFormat => {
    if (typeof window === 'undefined') return 'webp';
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      // Test AVIF support
      if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
        return 'avif';
      }
      
      // Test WebP support
      if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
        return 'webp';
      }
    } catch {
      // Fallback if browser block canvas access
    }
    
    return 'jpeg';
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [_hasError, setHasError] = useState(false);

  const handleLoad = (): void => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (): void => {
    setHasError(true);
    // Fallback to JPEG if WebP/AVIF fails
    if (format !== 'jpeg') {
      setFormat('jpeg');
      setHasError(false);
    } else {
      onError?.();
    }
  };

  const responsive = imageUrlGenerator.generateResponsive(imageId, format);
  const src = size !== 'medium' ? imageUrlGenerator.generate(imageId, size, format) : responsive.src;

  return (
    <div 
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        sizes={responsive.sizes}
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}

type ProductImageGalleryProps = {
  images: Array<{ id: string; alt: string }>;
  className?: string;
};

export function ProductImageGallery({ images, className }: ProductImageGalleryProps): React.JSX.Element | null {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images.length) return null;

  const currentImage = images[selectedIndex];
  if (!currentImage) return null;

  return (
    <div className={className}>
      {/* Main image */}
      <div className="main-image">
        <OptimizedImage
          imageId={currentImage.id}
          alt={currentImage.alt}
          size="large"
          priority={selectedIndex === 0}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="thumbnails">
          {images.map((image: { id: string; alt: string }, index: number) => (
            <button
              key={image.id}
              onClick={(): void => setSelectedIndex(index)}
              className={`thumbnail ${index === selectedIndex ? 'active' : ''}`}
            >
              <OptimizedImage
                imageId={image.id}
                alt={image.alt}
                size="thumbnail"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type LazyImageGridProps = {
  images: Array<{ id: string; alt: string }>;
  columns?: number;
  className?: string;
};

export function LazyImageGrid({ images, columns = 3, className }: LazyImageGridProps): React.JSX.Element {
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());

  useEffect((): (() => void) => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute('data-image-id');
            if (imageId) {
              setVisibleImages((prev: Set<string>) => new Set([...prev, imageId]));
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    const elements = document.querySelectorAll('[data-image-id]');
    elements.forEach((el: Element) => observer.observe(el));

    return (): void => observer.disconnect();
  }, [images]);

  return (
    <div 
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem'
      }}
    >
      {images.map((image: { id: string; alt: string }) => (
        <div
          key={image.id}
          data-image-id={image.id}
          style={{ aspectRatio: '1', backgroundColor: '#f0f0f0' }}
        >
          {visibleImages.has(image.id) && (
            <OptimizedImage
              imageId={image.id}
              alt={image.alt}
              size="medium"
            />
          )}
        </div>
      ))}
    </div>
  );
}
