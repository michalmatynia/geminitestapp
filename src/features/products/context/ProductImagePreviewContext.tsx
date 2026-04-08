'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

const PREVIEW_SIZE = 136;
const OFFSET_X = 72;
const OFFSET_Y = -90;
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';

interface PreviewState {
  imageUrl: string | null;
  productName: string | null;
  unoptimized: boolean;
  mousePos: { x: number; y: number };
  visible: boolean;
}

interface ProductImagePreviewContextType {
  showPreview: (args: { imageUrl: string; productName: string; unoptimized: boolean; event: React.MouseEvent }) => void;
  updatePreview: (event: React.MouseEvent) => void;
  hidePreview: () => void;
}

const ProductImagePreviewContext = createContext<ProductImagePreviewContextType | null>(null);

export const ProductImagePreviewProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<PreviewState>({
    imageUrl: null,
    productName: null,
    unoptimized: false,
    mousePos: { x: 0, y: 0 },
    visible: false,
  });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updateViewport = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const showPreview = useCallback(({ imageUrl, productName, unoptimized, event }: { imageUrl: string; productName: string; unoptimized: boolean; event: React.MouseEvent }) => {
    setState({
      imageUrl,
      productName,
      unoptimized,
      mousePos: { x: event.clientX, y: event.clientY },
      visible: true,
    });
  }, []);

  const updatePreview = useCallback((event: React.MouseEvent) => {
    if (rafRef.current !== null) return;
    const x = event.clientX;
    const y = event.clientY;
    rafRef.current = window.requestAnimationFrame(() => {
      setState(prev => prev.visible ? { ...prev, mousePos: { x, y } } : prev);
      rafRef.current = null;
    });
  }, []);

  const hidePreview = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const contextValue = useMemo(() => ({ showPreview, updatePreview, hidePreview }), [showPreview, updatePreview, hidePreview]);

  return (
    <ProductImagePreviewContext.Provider value={contextValue}>
      {children}
      {state.visible && state.imageUrl && typeof document !== 'undefined' && createPortal(
        <div
          className='fixed z-[100] pointer-events-none'
          style={{
            left: `${((): number => {
              const margin = 8;
              const left = state.mousePos.x - PREVIEW_SIZE - OFFSET_X;
              const right = state.mousePos.x + OFFSET_X;
              const fitsLeft = left >= margin;
              const fitsRight = right + PREVIEW_SIZE <= viewport.w - margin;
              if (fitsLeft) return left;
              if (fitsRight) return right;
              return Math.max(margin, Math.min(viewport.w - PREVIEW_SIZE - margin, left));
            })()}px`,
            top: `${((): number => {
              const margin = 8;
              const below = state.mousePos.y + OFFSET_Y;
              const above = state.mousePos.y - PREVIEW_SIZE - OFFSET_Y;
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
                src={state.imageUrl}
                alt={state.productName || 'Preview'}
                fill
                sizes={`${PREVIEW_SIZE}px`}
                unoptimized={state.unoptimized}
                placeholder='blur'
                blurDataURL={BLUR_PLACEHOLDER}
                className='rounded-lg object-cover'
                quality={80}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </ProductImagePreviewContext.Provider>
  );
};

export const useProductImagePreview = () => {
  const context = useContext(ProductImagePreviewContext);
  if (!context) {
    throw new Error('useProductImagePreview must be used within a ProductImagePreviewProvider');
  }
  return context;
};
