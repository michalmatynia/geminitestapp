'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

import { internalError } from '@/shared/errors/app-error';

const PREVIEW_SIZE = 136;
const OFFSET_X = 72;
const OFFSET_Y = -90;
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';

interface PreviewState {
  kind: 'image' | 'note' | null;
  imageUrl: string | null;
  productName: string | null;
  unoptimized: boolean;
  noteText: string | null;
  noteColor: string | null;
  mousePos: { x: number; y: number };
  visible: boolean;
}

type ImagePreviewArgs = {
  kind: 'image';
  imageUrl: string;
  productName: string;
  unoptimized: boolean;
  event: React.MouseEvent;
};

type NotePreviewArgs = {
  kind: 'note';
  productName: string;
  noteText: string | null;
  noteColor: string;
  event: React.MouseEvent;
};

interface ProductImagePreviewContextType {
  showPreview: (args: ImagePreviewArgs | NotePreviewArgs) => void;
  updatePreview: (event: React.MouseEvent) => void;
  hidePreview: () => void;
}

const getProductImagePreviewContext = () => {
  const registryKey = '__PRODUCT_IMAGE_PREVIEW_CONTEXT';
  const globalObj = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : (global as unknown as Record<string, unknown>));
  
  if (!globalObj[registryKey]) {
    globalObj[registryKey] = createContext<ProductImagePreviewContextType | null>(null);
  }
  
  return globalObj[registryKey] as React.Context<ProductImagePreviewContextType | null>;
};

const ProductImagePreviewContext = getProductImagePreviewContext();

export const ProductImagePreviewProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<PreviewState>({
    kind: null,
    imageUrl: null,
    productName: null,
    unoptimized: false,
    noteText: null,
    noteColor: null,
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

  const showPreview = useCallback((args: ImagePreviewArgs | NotePreviewArgs) => {
    if (args.kind === 'note') {
      setState({
        kind: 'note',
        imageUrl: null,
        productName: args.productName,
        unoptimized: false,
        noteText: args.noteText,
        noteColor: args.noteColor,
        mousePos: { x: args.event.clientX, y: args.event.clientY },
        visible: true,
      });
      return;
    }

    setState({
      kind: 'image',
      imageUrl: args.imageUrl,
      productName: args.productName,
      unoptimized: args.unoptimized,
      noteText: null,
      noteColor: null,
      mousePos: { x: args.event.clientX, y: args.event.clientY },
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
      {state.visible && state.kind && typeof document !== 'undefined' && createPortal(
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
            {state.kind === 'image' && state.imageUrl ? (
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
            ) : null}
            {state.kind === 'note' ? (
              <div className='h-[136px] w-[136px]'>
                <div
                  className='flex h-full w-full rounded-lg border border-black/10 px-3 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.22)]'
                  style={{ backgroundColor: state.noteColor ?? '#f5e7c3' }}
                >
                  <p className='w-full overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-[1.35] text-slate-900'>
                    {state.noteText?.trim() || 'No note text added yet.'}
                  </p>
                </div>
              </div>
            ) : null}
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
    throw internalError('useProductImagePreview must be used within a ProductImagePreviewProvider');
  }
  return context;
};
