'use client';

import { createContext, useContext } from 'react';
import type {
  VectorOverlayResult,
  VectorOverlayRequest,
  VectorOverlayValue,
} from '@/shared/contracts/vector';
import { internalError } from '@/shared/errors/app-error';

export type { VectorOverlayResult, VectorOverlayRequest, VectorOverlayValue };

export const VectorOverlayContext = createContext<VectorOverlayValue | undefined>(undefined);

export function useVectorOverlay(): VectorOverlayValue {
  const context = useContext(VectorOverlayContext);
  if (!context) {
    throw internalError('useVectorOverlay must be used within PageBuilderProvider');
  }
  return context;
}
