'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MissingImagePlaceholder } from '@/shared/ui';

interface ProductImageCellProps {
  imageUrl: string | null;
  productName: string;
}

const PREVIEW_SIZE = 136;
const OFFSET_X = 72;
const OFFSET_Y = -90;

// Tiny SVG placeholder (64×64 dark rect) — renders instantly while the real image loads.
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';

/**
 * Returns true for URLs that must bypass Next.js image optimization
 * (data URIs, blob URIs, and external hosts not in next.config remotePatterns).
 */
const shouldSkipOptimization = (url: string): boolean => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  // Local paths are handled by localPatterns in next.config.
  if (url.startsWith('/')) return false;
  try {
    const { hostname } = new URL(url);
    // Hosts configured in next.config.mjs remotePatterns.
    if (
      hostname === 'ik.imagekit.io' ||
      hostname === 'upload.cdn.baselinker.com' ||
      hostname === 'milkbardesigners.com'
    ) {
      return false;
    }
  } catch {
    // Malformed URL — skip optimization to avoid runtime error.
  }
  return true;
};

export const ProductImageCell = React.memo(function ProductImageCell({
  imageUrl,
  productName,
}: ProductImageCellProps): React.JSX.Element {
  const [showPreview, setShowPreview] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef({ x: 0, y: 0 });

  const unoptimized = useMemo(
    () => (imageUrl ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      setMousePos(pendingPosRef.current);
      rafRef.current = null;
    });
  }, []);

  useEffect((): (() => void) => {
    const updateViewport = (): void => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return (): void => {
      window.removeEventListener('resize', updateViewport);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (!imageUrl) {
    return <MissingImagePlaceholder className='size-16' />;
  }

  return (
    <div
      ref={containerRef}
      className='relative'
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onMouseMove={handleMouseMove}
    >
      <div className='relative h-16 w-16'>
        <Image
          src={imageUrl}
          alt={productName}
          fill
          sizes='64px'
          unoptimized={unoptimized}
          placeholder='blur'
          blurDataURL={BLUR_PLACEHOLDER}
          className='rounded-md object-cover cursor-pointer transition-opacity hover:opacity-80'
        />
      </div>

      {showPreview && (
        <div
          className='fixed z-50 pointer-events-none'
          style={{
            left: `${((): number => {
              const margin = 8;
              const left = mousePos.x - PREVIEW_SIZE - OFFSET_X;
              const right = mousePos.x + OFFSET_X;
              const fitsLeft = left >= margin;
              const fitsRight = right + PREVIEW_SIZE <= viewport.w - margin;
              if (fitsLeft) return left;
              if (fitsRight) return right;
              return Math.max(margin, Math.min(viewport.w - PREVIEW_SIZE - margin, left));
            })()}px`,
            top: `${((): number => {
              const margin = 8;
              const below = mousePos.y + OFFSET_Y;
              const above = mousePos.y - PREVIEW_SIZE - OFFSET_Y;
              const fitsBelow = below + PREVIEW_SIZE <= viewport.h - margin;
              const fitsAbove = above >= margin;
              if (fitsBelow) return below;
              if (fitsAbove) return above;
              return Math.max(margin, Math.min(viewport.h - PREVIEW_SIZE - margin, below));
            })()}px`,
          }}
        >
          <div className='bg-card rounded-lg overflow-hidden shadow-2xl border border-border/60'>
            <div className='relative h-[136px] w-[136px]'>
              <Image
                src={imageUrl}
                alt={productName}
                fill
                sizes={`${PREVIEW_SIZE}px`}
                unoptimized={unoptimized}
                placeholder='blur'
                blurDataURL={BLUR_PLACEHOLDER}
                className='rounded-lg object-cover'
                quality={90}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
