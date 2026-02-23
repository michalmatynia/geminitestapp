'use client';

import { createContext, useContext } from 'react';
import type { VectorShape } from '@/shared/ui';

export interface VectorOverlayResult {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorShape['points'] }>;
}

export interface VectorOverlayRequest {
  title: string;
  description?: string;
  initialShapes?: VectorShape[];
  onApply: (result: VectorOverlayResult) => void;
  onCancel?: () => void;
}

export interface VectorOverlayValue {
  vectorOverlay: VectorOverlayRequest | null;
  openVectorOverlay: (request: VectorOverlayRequest) => void;
  closeVectorOverlay: () => void;
}

export const VectorOverlayContext = createContext<VectorOverlayValue | undefined>(undefined);

export function useVectorOverlay(): VectorOverlayValue {
  const context = useContext(VectorOverlayContext);
  if (!context) {
    throw new Error('useVectorOverlay must be used within PageBuilderProvider');
  }
  return context;
}
