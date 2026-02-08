'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { MissingImagePlaceholder } from '@/shared/ui';

interface ProductImageCellProps {
  imageUrl: string | null;
  productName: string;
}

const PREVIEW_SIZE = 136;
const OFFSET_X = 72;
const OFFSET_Y = -90;

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
      <Image
        src={imageUrl}
        alt={productName}
        width={64}
        height={64}
        className='size-16 rounded-md object-cover cursor-pointer transition-opacity hover:opacity-80'
        style={{ width: 'auto', height: 'auto' }}
      />

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
            <Image
              src={imageUrl}
              alt={productName}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className='rounded-lg object-cover'
              style={{ width: 'auto', height: 'auto' }}
              priority
              quality={90}
            />
          </div>
        </div>
      )}
    </div>
  );
});
