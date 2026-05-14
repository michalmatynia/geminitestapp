/* eslint-disable @typescript-eslint/strict-boolean-expressions,complexity,max-lines-per-function */
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
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
  quality = 78,
}: {
  imageUrl?: string;
  gradient: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
  position?: string;
  quality?: number;
}): JSX.Element {
  const resolvedImageUrl = getProductImageSrc(imageUrl);
  const fallbackImageUrl = getProductImageFallbackSrc(imageUrl);
  const [activeImageUrl, setActiveImageUrl] = useState<string | undefined>(resolvedImageUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const revealFrameRef = useRef<number | undefined>(undefined);
  const previousResolvedImageUrlRef = useRef(resolvedImageUrl);
  const hasRenderableImage = activeImageUrl !== undefined && activeImageUrl.trim().length > 0 && !hasFailed;
  const usesNativeImage = shouldBypassImageOptimization(activeImageUrl);
  const frameStateClass = isLoaded || !hasRenderableImage ? 'is-loaded' : 'is-loading';

  const cancelPendingReveal = useCallback((): void => {
    if (revealFrameRef.current === undefined) return;

    window.cancelAnimationFrame(revealFrameRef.current);
    revealFrameRef.current = undefined;
  }, []);

  const revealImage = useCallback((): void => {
    cancelPendingReveal();
    revealFrameRef.current = window.requestAnimationFrame(() => {
      revealFrameRef.current = undefined;
      setIsLoaded(true);
    });
  }, [cancelPendingReveal]);

  useEffect(() => {
    if (previousResolvedImageUrlRef.current === resolvedImageUrl) return;

    previousResolvedImageUrlRef.current = resolvedImageUrl;
    cancelPendingReveal();
    setActiveImageUrl(resolvedImageUrl);
    setIsLoaded(false);
    setHasFailed(false);
  }, [cancelPendingReveal, resolvedImageUrl]);

  useEffect(() => cancelPendingReveal, [cancelPendingReveal]);

  const handleImageNode = useCallback(
    (node: HTMLImageElement | null): void => {
      if (!node || !hasRenderableImage || isLoaded) return;
      if (node.complete && node.naturalWidth > 0) revealImage();
    },
    [hasRenderableImage, isLoaded, revealImage]
  );

  const handleImageLoad = (): void => {
    revealImage();
  };

  const handleImageError = (): void => {
    if (fallbackImageUrl && activeImageUrl !== fallbackImageUrl) {
      cancelPendingReveal();
      setActiveImageUrl(fallbackImageUrl);
      setIsLoaded(false);
      return;
    }
    setHasFailed(true);
    setIsLoaded(true);
  };

  return (
    <div className={`${className} product-image-frame ${frameStateClass} overflow-hidden`}>
      <div className='absolute inset-0' style={{ background: gradient }} />
      {hasRenderableImage && (
        <div className='product-image-skeleton' aria-hidden='true' />
      )}
      {hasRenderableImage && usesNativeImage && (
        <img
          ref={handleImageNode}
          src={activeImageUrl}
          alt={alt}
          className='product-image-media'
          loading={priority ? 'eager' : 'lazy'}
          decoding='async'
          fetchPriority={priority ? 'high' : 'auto'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: position,
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      {hasRenderableImage && !usesNativeImage && (
        <Image
          ref={handleImageNode}
          src={activeImageUrl}
          alt={alt}
          className='product-image-media'
          fill
          sizes={sizes}
          priority={priority}
          quality={quality}
          fetchPriority={priority ? 'high' : 'auto'}
          style={{ objectFit: fit, objectPosition: position }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  );
}
