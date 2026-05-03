'use client';

import Image from 'next/image';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

interface ViewportState {
  w: number;
  h: number;
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

const INITIAL_PREVIEW_STATE: PreviewState = {
  kind: null,
  imageUrl: null,
  productName: null,
  unoptimized: false,
  noteText: null,
  noteColor: null,
  mousePos: { x: 0, y: 0 },
  visible: false,
};

const getGlobalPreviewRegistry = (): Record<string, unknown> => {
  if (typeof window !== 'undefined') return window as unknown as Record<string, unknown>;
  return globalThis as unknown as Record<string, unknown>;
};

const getProductImagePreviewContext = (): React.Context<ProductImagePreviewContextType | null> => {
  const registryKey = '__PRODUCT_IMAGE_PREVIEW_CONTEXT';
  const globalObj = getGlobalPreviewRegistry();

  if (globalObj[registryKey] === undefined) {
    globalObj[registryKey] = createContext<ProductImagePreviewContextType | null>(null);
  }

  return globalObj[registryKey] as React.Context<ProductImagePreviewContextType | null>;
};

const ProductImagePreviewContext = getProductImagePreviewContext();

const createNotePreviewState = (args: NotePreviewArgs): PreviewState => ({
  kind: 'note',
  imageUrl: null,
  productName: args.productName,
  unoptimized: false,
  noteText: args.noteText,
  noteColor: args.noteColor,
  mousePos: { x: args.event.clientX, y: args.event.clientY },
  visible: true,
});

const createImagePreviewState = (args: ImagePreviewArgs): PreviewState => ({
  kind: 'image',
  imageUrl: args.imageUrl,
  productName: args.productName,
  unoptimized: args.unoptimized,
  noteText: null,
  noteColor: null,
  mousePos: { x: args.event.clientX, y: args.event.clientY },
  visible: true,
});

const createPreviewState = (args: ImagePreviewArgs | NotePreviewArgs): PreviewState => {
  if (args.kind === 'note') return createNotePreviewState(args);
  return createImagePreviewState(args);
};

const useViewport = (): ViewportState => {
  const [viewport, setViewport] = useState<ViewportState>({ w: 0, h: 0 });

  useEffect(() => {
    const updateViewport = (): void =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return (): void => window.removeEventListener('resize', updateViewport);
  }, []);

  return viewport;
};

const resolvePreviewLeft = (state: PreviewState, viewport: ViewportState): number => {
  const margin = 8;
  const left = state.mousePos.x - PREVIEW_SIZE - OFFSET_X;
  const right = state.mousePos.x + OFFSET_X;
  const fitsLeft = left >= margin;
  const fitsRight = right + PREVIEW_SIZE <= viewport.w - margin;
  if (fitsLeft) return left;
  if (fitsRight) return right;
  return Math.max(margin, Math.min(viewport.w - PREVIEW_SIZE - margin, left));
};

const resolvePreviewTop = (state: PreviewState, viewport: ViewportState): number => {
  const margin = 8;
  const below = state.mousePos.y + OFFSET_Y;
  const above = state.mousePos.y - PREVIEW_SIZE - OFFSET_Y;
  const fitsBelow = below + PREVIEW_SIZE <= viewport.h - margin;
  const fitsAbove = above >= margin;
  if (fitsBelow) return below;
  if (fitsAbove) return above;
  return Math.max(margin, Math.min(viewport.h - PREVIEW_SIZE - margin, below));
};

function ProductImagePreviewContent({ state }: { state: PreviewState }): React.JSX.Element | null {
  if (state.kind !== 'image') return null;
  if (state.imageUrl === null || state.imageUrl === '') return null;

  return (
    <div className='relative h-[136px] w-[136px]'>
      <Image
        src={state.imageUrl}
        alt={state.productName ?? 'Preview'}
        fill
        sizes={`${PREVIEW_SIZE}px`}
        unoptimized={state.unoptimized}
        placeholder='blur'
        blurDataURL={BLUR_PLACEHOLDER}
        className='rounded-lg object-cover'
        quality={80}
      />
    </div>
  );
}

const resolveNotePreviewText = (noteText: string | null): string => {
  const trimmed = typeof noteText === 'string' ? noteText.trim() : '';
  if (trimmed.length > 0) return trimmed;
  return 'No note text added yet.';
};

function ProductNotePreviewContent({ state }: { state: PreviewState }): React.JSX.Element | null {
  if (state.kind !== 'note') return null;

  return (
    <div className='h-[136px] w-[136px]'>
      <div
        className='flex h-full w-full rounded-lg border border-black/10 px-3 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.22)]'
        style={{ backgroundColor: state.noteColor ?? '#f5e7c3' }}
      >
        <p className='w-full overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-[1.35] text-slate-900'>
          {resolveNotePreviewText(state.noteText)}
        </p>
      </div>
    </div>
  );
}

function ProductImagePreviewPortal({
  state,
  viewport,
}: {
  state: PreviewState;
  viewport: ViewportState;
}): React.ReactPortal | null {
  if (state.visible === false || state.kind === null || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className='fixed z-[100] pointer-events-none'
      style={{
        left: `${resolvePreviewLeft(state, viewport)}px`,
        top: `${resolvePreviewTop(state, viewport)}px`,
      }}
    >
      <div className='bg-card rounded-lg overflow-hidden shadow-2xl border border-border/60'>
        <ProductImagePreviewContent state={state} />
        <ProductNotePreviewContent state={state} />
      </div>
    </div>,
    document.body
  );
}

const useProductImagePreviewController = (): {
  contextValue: ProductImagePreviewContextType;
  state: PreviewState;
  viewport: ViewportState;
} => {
  const [state, setState] = useState<PreviewState>(INITIAL_PREVIEW_STATE);
  const viewport = useViewport();
  const rafRef = useRef<number | null>(null);

  const showPreview = useCallback((args: ImagePreviewArgs | NotePreviewArgs): void => {
    setState(createPreviewState(args));
  }, []);

  const updatePreview = useCallback((event: React.MouseEvent): void => {
    if (rafRef.current !== null) return;
    const x = event.clientX;
    const y = event.clientY;
    rafRef.current = window.requestAnimationFrame(() => {
      setState((prev): PreviewState =>
        prev.visible === true ? { ...prev, mousePos: { x, y } } : prev
      );
      rafRef.current = null;
    });
  }, []);

  const hidePreview = useCallback((): void => {
    setState((prev): PreviewState => ({ ...prev, visible: false }));
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const contextValue = useMemo<ProductImagePreviewContextType>(
    () => ({ showPreview, updatePreview, hidePreview }),
    [hidePreview, showPreview, updatePreview]
  );

  return { contextValue, state, viewport };
};

export function ProductImagePreviewProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { contextValue, state, viewport } = useProductImagePreviewController();

  return (
    <ProductImagePreviewContext.Provider value={contextValue}>
      {children}
      <ProductImagePreviewPortal state={state} viewport={viewport} />
    </ProductImagePreviewContext.Provider>
  );
}

export const useProductImagePreview = (): ProductImagePreviewContextType => {
  const context = useContext(ProductImagePreviewContext);
  if (context === null) {
    throw internalError('useProductImagePreview must be used within a ProductImagePreviewProvider');
  }
  return context;
};
