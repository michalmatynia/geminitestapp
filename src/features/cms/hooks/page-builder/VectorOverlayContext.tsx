'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type {
  VectorOverlayResult,
  VectorOverlayRequest,
  VectorOverlayValue,
} from '@/shared/contracts/vector';
import { internalError } from '@/shared/errors/app-error';

export type { VectorOverlayResult, VectorOverlayRequest, VectorOverlayValue };

const { Context: VectorOverlayContext, useStrictContext: useVectorOverlay } =
  createStrictContext<VectorOverlayValue>({
    hookName: 'useVectorOverlay',
    providerName: 'PageBuilderProvider',
    displayName: 'VectorOverlayContext',
    errorFactory: internalError,
  });

export { VectorOverlayContext, useVectorOverlay };
