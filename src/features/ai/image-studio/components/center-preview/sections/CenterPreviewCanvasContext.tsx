'use client';

import React from 'react';

import type {
  PreviewCanvasCropRect,
  PreviewCanvasImageContentFrame,
} from '@/features/ai/image-studio/context/UiContext';
import type { VectorShape } from '@/shared/contracts/vector';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { VectorDrawingContextValue } from '@/shared/lib/vector-drawing';

export interface CenterPreviewCanvasContextValue {
  vectorContextValue: VectorDrawingContextValue;
  projectCanvasSize: { width: number; height: number } | null;
  activeCanvasImageSrc: string | null;
  liveMaskShapes: VectorShape[];
  splitVariantView: boolean;
  canCompareSelectedVariants: boolean;
  compareVariantImageA: string | null;
  compareVariantImageB: string | null;
  canCompareWithSource: boolean;
  sourceSlotImageSrc: string | null;
  workingSlotImageSrc: string | null;
  isCompositeSlot: boolean;
  canNavigateToSource: boolean;
  canRevealLoadedCardInTree: boolean;
  onPreviewCanvasCropRectChange: (rect: PreviewCanvasCropRect | null) => void;
  onPreviewCanvasImageFrameChange: (frame: PreviewCanvasImageContentFrame | null) => void;
  onGoToSourceSlot: () => void;
  onToggleSourceVariantView: () => void;
  onToggleSplitVariantView: () => void;
  onRevealInTreeFromCanvas: () => void;
}

const { Context: CenterPreviewCanvasContext, useStrictContext: useCenterPreviewCanvasContext } =
  createStrictContext<CenterPreviewCanvasContextValue>({
    hookName: 'useCenterPreviewCanvasContext',
    providerName: 'CenterPreviewCanvasSectionProvider',
    displayName: 'CenterPreviewCanvasContext',
    errorFactory: internalError,
  });

export function CenterPreviewCanvasSectionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CenterPreviewCanvasContextValue;
}): React.JSX.Element {
  return (
    <CenterPreviewCanvasContext.Provider value={value}>
      {children}
    </CenterPreviewCanvasContext.Provider>
  );
}
export { useCenterPreviewCanvasContext };
