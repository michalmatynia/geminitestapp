import type { ImageStudioCenterObjectBounds } from '@/features/ai/image-studio/contracts/center';
import { ObjectLayoutFixtureExpectation } from './types';

export const exactExpectation = (
  bounds: ImageStudioCenterObjectBounds,
  options?: Partial<ObjectLayoutFixtureExpectation>
): ObjectLayoutFixtureExpectation => ({
  bounds,
  minIou: 0.995,
  maxEdgeDeltaPx: 0,
  minConfidence: 0.45,
  ...(options ?? {}),
});

export const tolerantExpectation = (
  bounds: ImageStudioCenterObjectBounds,
  options?: Partial<ObjectLayoutFixtureExpectation>
): ObjectLayoutFixtureExpectation => ({
  bounds,
  minIou: 0.9,
  maxEdgeDeltaPx: 3,
  minConfidence: 0.2,
  ...(options ?? {}),
});
